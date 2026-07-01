import { describe, expect, it } from 'vitest';

import type { TraceTimelineEvent } from '@oacp/observability-client';

import {
  filterTimelineForAgent,
  tailTimelineEventsForAgent,
  timelineEventInvolvesAgent,
} from './timeline-agent-filter.js';

const timeline: TraceTimelineEvent[] = [
  {
    index: 0,
    timestamp: '2026-06-20T00:00:00.000Z',
    type: 'task_request',
    from: 'agent://coordinator',
    to: 'agent://worker',
    message_id: 'm1',
    summary: 'request',
  },
  {
    index: 1,
    timestamp: '2026-06-20T00:00:01.000Z',
    type: 'task_response',
    from: 'agent://worker',
    to: 'agent://coordinator',
    message_id: 'm2',
    summary: 'response',
  },
];

describe('timelineEventInvolvesAgent', () => {
  it('matches sender and recipient', () => {
    expect(timelineEventInvolvesAgent(timeline[0]!, 'agent://worker')).toBe(true);
    expect(timelineEventInvolvesAgent(timeline[1]!, 'agent://coordinator')).toBe(true);
    expect(timelineEventInvolvesAgent(timeline[0]!, 'agent://planner')).toBe(false);
  });
});

describe('filterTimelineForAgent', () => {
  it('returns only events for the selected agent', () => {
    const filtered = filterTimelineForAgent(timeline, 'agent://worker');
    expect(filtered.map((event) => event.message_id)).toEqual(['m1', 'm2']);
  });

  it('returns full timeline when agent id is undefined', () => {
    expect(filterTimelineForAgent(timeline, undefined)).toEqual(timeline);
  });
});

describe('tailTimelineEventsForAgent', () => {
  it('tails after agent filtering', () => {
    const tailed = tailTimelineEventsForAgent(timeline, 'agent://coordinator', 1);
    expect(tailed.map((event) => event.message_id)).toEqual(['m2']);
  });
});
