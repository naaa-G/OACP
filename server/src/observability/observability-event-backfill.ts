import type { OacpMessage } from '@oacp/core';
import type { ObservabilityEvent } from '@oacp/observability-client';

import type { ObservabilityEventBus } from './observability-event-bus.js';
import {
  buildMessageAppendedEventData,
  buildTraceCompletedEventData,
  buildTraceStartedEventData,
  isRootTraceCompletion,
} from './observability-event-emitter.js';

/** Synthesize observability events from persisted bus messages after SSE cursor loss. */
export function synthesizeTraceObservabilityEvents(
  messages: readonly OacpMessage[],
): readonly ObservabilityEvent[] {
  if (messages.length === 0) {
    return [];
  }

  const events: ObservabilityEvent[] = [];
  const rootMessageId = messages[0]?.message_id;
  let sequence = 1;

  const first = messages[0];
  if (first !== undefined) {
    events.push({
      id: `synthetic-${sequence++}`,
      type: 'trace.started',
      timestamp: first.timestamp,
      data: buildTraceStartedEventData(first),
    });
  }

  for (const message of messages) {
    events.push({
      id: `synthetic-${sequence++}`,
      type: 'message.appended',
      timestamp: message.timestamp,
      data: buildMessageAppendedEventData(message),
    });

    if (isRootTraceCompletion(message, rootMessageId)) {
      events.push({
        id: `synthetic-${sequence++}`,
        type: 'trace.completed',
        timestamp: message.timestamp,
        data: buildTraceCompletedEventData(message, messages.length),
      });
    }
  }

  return events;
}

export function backfillTraceEventsAfterCursor(
  eventBus: ObservabilityEventBus,
  messages: readonly OacpMessage[],
  afterEventId: string | undefined,
): readonly ObservabilityEvent[] {
  const synthesized = synthesizeTraceObservabilityEvents(messages);
  if (afterEventId === undefined || afterEventId.length === 0) {
    return synthesized;
  }

  const numericAfter = Number.parseInt(afterEventId, 10);
  if (Number.isFinite(numericAfter)) {
    return synthesized.filter((event) => Number.parseInt(event.id, 10) > numericAfter);
  }

  return synthesized;
}
