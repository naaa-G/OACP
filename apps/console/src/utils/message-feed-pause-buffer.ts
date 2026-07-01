import type { TraceTimelineEvent } from '@oacp/observability-client';
import { mergeTimelineEventsAppendOnly } from '@oacp/observability-client';

/** Append unique timeline rows to a pause buffer (Day 48). */
export function appendToMessageFeedPauseBuffer(
  buffer: readonly TraceTimelineEvent[],
  existingRows: readonly TraceTimelineEvent[],
  incoming: readonly TraceTimelineEvent[],
): readonly TraceTimelineEvent[] {
  if (incoming.length === 0) {
    return buffer;
  }

  const knownIds = new Set([
    ...existingRows.map((event) => event.message_id),
    ...buffer.map((event) => event.message_id),
  ]);

  const next = [...buffer];
  for (const event of incoming) {
    if (knownIds.has(event.message_id)) {
      continue;
    }
    knownIds.add(event.message_id);
    next.push(event);
  }

  return next;
}

export function flushMessageFeedPauseBuffer(
  rows: readonly TraceTimelineEvent[],
  buffer: readonly TraceTimelineEvent[],
  tailLimit: number,
): { rows: readonly TraceTimelineEvent[]; appendedMessageIds: readonly string[] } {
  if (buffer.length === 0) {
    return { rows, appendedMessageIds: [] };
  }

  const merged = mergeTimelineEventsAppendOnly(rows, buffer, tailLimit);
  return { rows: merged.rows, appendedMessageIds: merged.appendedMessageIds };
}
