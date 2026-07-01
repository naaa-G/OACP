import type { PlaygroundSnapshot, TraceTimelineEvent } from '@oacp/observability-client';

import { buildE2eSnapshot, E2E_TRACE_ID } from './snapshot.js';

export function buildLargeTimelineEvent(index: number): TraceTimelineEvent {
  const messageType =
    index % 3 === 0 ? 'task_response' : index % 2 === 0 ? 'delegation' : 'task_request';
  const status =
    messageType === 'task_response' ? (index % 6 === 0 ? 'error' : 'success') : undefined;

  return {
    index,
    timestamp: new Date(Date.parse('2026-06-21T00:00:00.000Z') + index * 100).toISOString(),
    type: messageType,
    from: index % 2 === 0 ? 'agent://coordinator' : 'agent://worker',
    to: index % 2 === 0 ? 'agent://worker' : 'agent://coordinator',
    capability: `cap-${index % 7}`,
    ...(status !== undefined ? { status } : {}),
    message_id: `msg-bulk-${index}`,
    summary: `${messageType} bulk ${index}`,
  };
}

export function buildLargeTimelineSnapshot(
  messageCount: number = 1000,
  traceId: string = E2E_TRACE_ID,
): PlaygroundSnapshot {
  const base = buildE2eSnapshot(traceId);
  const timeline = Array.from({ length: messageCount }, (_, index) =>
    buildLargeTimelineEvent(index),
  );

  return {
    ...base,
    active_trace: {
      ...base.active_trace!,
      message_count: timeline.length,
      message_types: ['task_request', 'task_response', 'delegation'],
      timeline,
    },
    traces: base.traces.map((trace) =>
      trace.traceId === traceId ? { ...trace, messageCount: timeline.length } : trace,
    ),
  };
}
