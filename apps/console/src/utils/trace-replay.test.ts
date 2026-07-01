import type { TraceGraphView, TraceTimelineEvent } from '@oacp/observability-client';
import { describe, expect, it } from 'vitest';

import {
  aggregateEdgesFromTimelinePrefix,
  agentsInTimelinePrefix,
  clampReplayMessageIndex,
  replayStepDelayMs,
  sliceTimelineForReplay,
  sliceTraceGraphForReplay,
  traceReplaySupported,
} from './trace-replay.js';

const timeline: TraceTimelineEvent[] = [
  {
    index: 0,
    timestamp: '2026-06-20T00:00:00.000Z',
    type: 'task_request',
    from: 'agent://coordinator',
    to: 'agent://worker',
    capability: 'echo',
    message_id: 'msg-1',
    summary: 'task_request from coordinator',
  },
  {
    index: 1,
    timestamp: '2026-06-20T00:00:01.000Z',
    type: 'task_response',
    from: 'agent://worker',
    status: 'success',
    message_id: 'msg-2',
    summary: 'task_response (success)',
  },
  {
    index: 2,
    timestamp: '2026-06-20T00:00:02.000Z',
    type: 'task_request',
    from: 'agent://coordinator',
    to: 'agent://planner',
    capability: 'plan',
    message_id: 'msg-3',
    summary: 'task_request from coordinator',
  },
];

const fullGraph: TraceGraphView = {
  trace_id: 'trace-1',
  layout: 'hierarchical',
  max_depth: 1,
  nodes: [
    {
      agent_id: 'agent://coordinator',
      name: 'Coordinator',
      depth: 0,
      status: 'active',
      capabilities: ['orchestrate'],
    },
    {
      agent_id: 'agent://worker',
      name: 'Worker',
      depth: 1,
      status: 'active',
      capabilities: ['echo'],
    },
    {
      agent_id: 'agent://planner',
      name: 'Planner',
      depth: 1,
      status: 'active',
      capabilities: ['plan'],
    },
  ],
  edges: [
    {
      from_agent: 'agent://coordinator',
      to_agent: 'agent://worker',
      kind: 'subtask',
      capability: 'echo',
      message_count: 1,
    },
    {
      from_agent: 'agent://coordinator',
      to_agent: 'agent://planner',
      kind: 'subtask',
      capability: 'plan',
      message_count: 1,
    },
  ],
};

describe('clampReplayMessageIndex', () => {
  it('clamps to valid range', () => {
    expect(clampReplayMessageIndex(-2, 3)).toBe(0);
    expect(clampReplayMessageIndex(1, 3)).toBe(1);
    expect(clampReplayMessageIndex(99, 3)).toBe(2);
    expect(clampReplayMessageIndex(0, 0)).toBe(0);
  });
});

describe('sliceTimelineForReplay', () => {
  it('returns inclusive prefix', () => {
    expect(sliceTimelineForReplay(timeline, 0)).toHaveLength(1);
    expect(sliceTimelineForReplay(timeline, 2)).toEqual(timeline);
  });
});

describe('agentsInTimelinePrefix', () => {
  it('collects senders and recipients', () => {
    const agents = agentsInTimelinePrefix(sliceTimelineForReplay(timeline, 0));
    expect([...agents].sort()).toEqual(['agent://coordinator', 'agent://worker']);
  });
});

describe('aggregateEdgesFromTimelinePrefix', () => {
  it('builds subtask edges from task_request events', () => {
    const edges = aggregateEdgesFromTimelinePrefix(sliceTimelineForReplay(timeline, 2));
    expect(edges).toHaveLength(2);
    expect(edges.find((edge) => edge.to_agent === 'agent://planner')).toMatchObject({
      kind: 'subtask',
      message_count: 1,
    });
  });
});

describe('sliceTraceGraphForReplay', () => {
  it('hides agents not yet seen in timeline prefix', () => {
    const atFirst = sliceTraceGraphForReplay(fullGraph, timeline, 0);
    expect(atFirst.nodes.map((node) => node.agent_id).sort()).toEqual([
      'agent://coordinator',
      'agent://worker',
    ]);
    expect(atFirst.edges).toHaveLength(1);

    const atLast = sliceTraceGraphForReplay(fullGraph, timeline, 2);
    expect(atLast.nodes).toHaveLength(3);
    expect(atLast.edges).toHaveLength(2);
  });
});

describe('replayStepDelayMs', () => {
  it('uses timestamp delta scaled by speed', () => {
    expect(replayStepDelayMs(timeline, 0, 1)).toBe(1000);
    expect(replayStepDelayMs(timeline, 0, 2)).toBe(500);
  });
});

describe('traceReplaySupported', () => {
  it('requires at least two messages', () => {
    expect(traceReplaySupported(0)).toBe(false);
    expect(traceReplaySupported(1)).toBe(false);
    expect(traceReplaySupported(2)).toBe(true);
  });
});
