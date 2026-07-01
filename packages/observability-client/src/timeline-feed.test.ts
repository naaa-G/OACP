import { describe, expect, it } from 'vitest';

import {
  FEED_TAIL_LIMIT,
  formatTimelineRoute,
  tailTimelineEvents,
  timelineFeedStatus,
  timelineMessageTone,
  timelineMessageToneStyle,
} from './timeline-feed.js';
import type { TraceTimelineEvent } from './types.js';

function event(index: number, overrides: Partial<TraceTimelineEvent> = {}): TraceTimelineEvent {
  return {
    index,
    timestamp: '2026-01-01T00:00:00.000Z',
    type: 'task_request',
    from: 'agent://a',
    message_id: `msg-${index}`,
    summary: `event ${index}`,
    ...overrides,
  };
}

describe('tailTimelineEvents', () => {
  it('returns empty array for undefined input', () => {
    expect(tailTimelineEvents(undefined)).toEqual([]);
  });

  it('returns all events when under limit', () => {
    const events = [event(0), event(1)];
    expect(tailTimelineEvents(events)).toEqual(events);
  });

  it('returns last N events when over limit', () => {
    const events = Array.from({ length: FEED_TAIL_LIMIT + 5 }, (_, index) => event(index));
    const tail = tailTimelineEvents(events);
    expect(tail).toHaveLength(FEED_TAIL_LIMIT);
    expect(tail[0]?.index).toBe(5);
    expect(tail.at(-1)?.index).toBe(FEED_TAIL_LIMIT + 4);
  });
});

describe('formatTimelineRoute', () => {
  it('formats from, to, and capability', () => {
    expect(
      formatTimelineRoute({
        ...event(0),
        from: 'agent://planner',
        to: 'agent://coder',
        capability: 'implement',
      }),
    ).toBe('agent://planner → agent://coder · implement');
  });
});

describe('timelineFeedStatus', () => {
  it('maps response status to feed accent', () => {
    expect(timelineFeedStatus({ ...event(0), status: 'success' })).toBe('success');
    expect(timelineFeedStatus({ ...event(0), status: 'error' })).toBe('error');
    expect(timelineFeedStatus(event(0))).toBe('neutral');
  });
});

describe('timelineMessageTone', () => {
  it('maps Day 50 message types to stable tones', () => {
    expect(timelineMessageTone(event(0, { type: 'task_request' }))).toBe('request');
    expect(timelineMessageTone(event(1, { type: 'delegation' }))).toBe('delegation');
    expect(timelineMessageTone(event(2, { type: 'task_response', status: 'success' }))).toBe(
      'response-success',
    );
    expect(timelineMessageTone(event(3, { type: 'task_response', status: 'error' }))).toBe(
      'response-error',
    );
    expect(timelineMessageTone(event(4, { type: 'heartbeat' }))).toBe('neutral');
  });

  it('exposes labels and colors for UI legends', () => {
    expect(timelineMessageToneStyle(event(0, { type: 'task_request' }))).toMatchObject({
      label: 'Task request',
      color: '#5b9cf5',
    });
  });
});
