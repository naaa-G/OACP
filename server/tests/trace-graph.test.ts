import { describe, expect, it } from 'vitest';

import type { TraceTimelineEvent } from '@oacp/core';

import {
  aggregateAgentLinksFromTimeline,
  DELEGATION_EDGE_KINDS,
} from '../src/observability/agent-link-aggregator.js';
import { computeAgentDepths } from '../src/observability/trace-graph.js';

describe('aggregateAgentLinksFromTimeline', () => {
  it('builds subtask links from task_request timeline events', () => {
    const timeline: TraceTimelineEvent[] = [
      {
        index: 0,
        timestamp: '2026-06-20T00:00:00.000Z',
        type: 'task_request',
        from: 'agent://coordinator',
        to: 'agent://worker',
        capability: 'echo',
        message_id: 'm1',
        summary: 'request',
      },
    ];

    const links = aggregateAgentLinksFromTimeline(timeline);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      from_agent: 'agent://coordinator',
      to_agent: 'agent://worker',
      kind: 'subtask',
    });
  });
});

describe('computeAgentDepths', () => {
  it('assigns increasing depth along delegation edges', () => {
    const links = [
      {
        from_agent: 'agent://coordinator',
        to_agent: 'agent://planner',
        kind: 'delegates',
        message_count: 1,
      },
      {
        from_agent: 'agent://planner',
        to_agent: 'agent://worker',
        kind: 'subtask',
        message_count: 1,
      },
    ];

    const depths = computeAgentDepths(
      ['agent://coordinator', 'agent://planner', 'agent://worker'],
      links,
    );

    expect(DELEGATION_EDGE_KINDS.has('delegates')).toBe(true);
    expect(depths.get('agent://coordinator')).toBe(0);
    expect(depths.get('agent://planner')).toBe(1);
    expect(depths.get('agent://worker')).toBe(2);
  });

  it('defaults all agents to depth 0 when no delegation edges exist', () => {
    const depths = computeAgentDepths(['agent://solo'], []);
    expect(depths.get('agent://solo')).toBe(0);
  });
});
