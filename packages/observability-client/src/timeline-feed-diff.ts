import type { MessageAppendedEventData } from './events.js';
import type { TraceTimelineEvent } from './types.js';

export interface AppendTimelineMergeResult {
  readonly rows: readonly TraceTimelineEvent[];
  readonly appendedMessageIds: readonly string[];
}

function summarizeAppendedMessage(data: MessageAppendedEventData): string {
  switch (data.message_type) {
    case 'task_request':
      return `task_request → ${data.to ?? data.capability ?? 'capability'}`;
    case 'task_response':
      return data.status === 'success'
        ? 'task_response (success)'
        : `task_response (${data.status ?? 'error'})`;
    case 'delegation':
      return `delegation → ${data.to ?? data.capability ?? 'capability'}`;
    case 'capability_query':
      return `capability_query (${data.capability ?? 'unknown'})`;
    default:
      return data.message_type;
  }
}

/** Build a feed row from an SSE `message.appended` payload (Day 47). */
export function timelineEventFromMessageAppended(
  data: MessageAppendedEventData,
  index: number,
): TraceTimelineEvent {
  const to = data.to;
  const capability = data.capability;
  const status = data.message_type === 'task_response' ? data.status : undefined;

  return {
    index,
    timestamp: data.timestamp,
    type: data.message_type,
    from: data.from,
    ...(to !== undefined && to.length > 0 ? { to } : {}),
    ...(capability !== undefined && capability.length > 0 ? { capability } : {}),
    ...(status !== undefined ? { status } : {}),
    message_id: data.message_id,
    summary: summarizeAppendedMessage(data),
  };
}

/**
 * Append-only timeline merge keyed by `message_id`.
 * Preserves existing row object references so React does not remount stable rows.
 */
export function mergeTimelineEventsAppendOnly(
  existing: readonly TraceTimelineEvent[],
  incoming: readonly TraceTimelineEvent[],
  limit?: number,
): AppendTimelineMergeResult {
  if (incoming.length === 0) {
    return { rows: existing, appendedMessageIds: [] };
  }

  const existingIds = new Set(existing.map((event) => event.message_id));
  const merged: TraceTimelineEvent[] = [...existing];
  const appendedMessageIds: string[] = [];

  for (const event of incoming) {
    if (existingIds.has(event.message_id)) {
      continue;
    }
    existingIds.add(event.message_id);
    merged.push(event);
    appendedMessageIds.push(event.message_id);
  }

  if (appendedMessageIds.length === 0) {
    return { rows: existing, appendedMessageIds: [] };
  }

  if (limit !== undefined && merged.length > limit) {
    return {
      rows: merged.slice(-limit),
      appendedMessageIds,
    };
  }

  return { rows: merged, appendedMessageIds };
}

/** Detect message ids present in `incoming` but not in `existing`. */
export function diffNewTimelineMessageIds(
  existing: readonly TraceTimelineEvent[],
  incoming: readonly TraceTimelineEvent[],
): readonly string[] {
  const existingIds = new Set(existing.map((event) => event.message_id));
  return incoming
    .filter((event) => !existingIds.has(event.message_id))
    .map((event) => event.message_id);
}
