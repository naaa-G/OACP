import type { TraceTimelineEvent } from './types.js';

/** Max timeline rows shown in the message feed (legacy playground parity). */
export const FEED_TAIL_LIMIT = 40;

/** Max rows retained when the virtualized feed is active (Day 49). */
export const FEED_VIRTUAL_TAIL_LIMIT = 5000;

export type TimelineFeedStatus = 'success' | 'error' | 'neutral';

export type TimelineMessageTone =
  | 'request'
  | 'delegation'
  | 'response-success'
  | 'response-error'
  | 'neutral';

export interface TimelineMessageToneStyle {
  readonly tone: TimelineMessageTone;
  readonly label: string;
  readonly color: string;
}

export const TIMELINE_MESSAGE_TONE_STYLES: Readonly<
  Record<TimelineMessageTone, TimelineMessageToneStyle>
> = {
  request: { tone: 'request', label: 'Task request', color: '#5b9cf5' },
  delegation: { tone: 'delegation', label: 'Delegation', color: '#a78bfa' },
  'response-success': {
    tone: 'response-success',
    label: 'Task response success',
    color: '#22c55e',
  },
  'response-error': { tone: 'response-error', label: 'Task response error', color: '#ef4444' },
  neutral: { tone: 'neutral', label: 'Message', color: '#94a3b8' },
};

/** Return the most recent timeline events for the feed panel. */
export function tailTimelineEvents(
  events: readonly TraceTimelineEvent[] | undefined,
  limit: number = FEED_TAIL_LIMIT,
): readonly TraceTimelineEvent[] {
  if (events === undefined || events.length === 0) {
    return [];
  }
  if (events.length <= limit) {
    return events;
  }
  return events.slice(-limit);
}

/** Route line under the summary — mirrors legacy playground feed meta. */
export function formatTimelineRoute(event: TraceTimelineEvent): string {
  const parts: string[] = [event.from];
  if (event.to !== undefined && event.to.length > 0) {
    parts.push(`→ ${event.to}`);
  }
  if (event.capability !== undefined && event.capability.length > 0) {
    parts.push(`· ${event.capability}`);
  }
  return parts.join(' ');
}

/** Border accent class derived from task response status. */
export function timelineFeedStatus(event: TraceTimelineEvent): TimelineFeedStatus {
  if (event.status === 'success') {
    return 'success';
  }
  if (event.status === 'error') {
    return 'error';
  }
  return 'neutral';
}

/** Stable visual tone for enterprise feed scanning and demo narration. */
export function timelineMessageTone(event: TraceTimelineEvent): TimelineMessageTone {
  if (event.type === 'task_request') {
    return 'request';
  }
  if (event.type === 'delegation') {
    return 'delegation';
  }
  if (event.type === 'task_response') {
    return event.status === 'error' ? 'response-error' : 'response-success';
  }
  return 'neutral';
}

export function timelineMessageToneStyle(event: TraceTimelineEvent): TimelineMessageToneStyle {
  return TIMELINE_MESSAGE_TONE_STYLES[timelineMessageTone(event)];
}
