import { describe, expect, it } from 'vitest';

import type { TraceGraphEdge } from '@oacp/observability-client';

import {
  computeOpsEdgeStrokeWidth,
  listOpsEdgeKindsInGraph,
  maxOpsEdgeMessageCount,
  resolveOpsEdgeVisualStyle,
} from './ops-graph-edge.js';

describe('ops-graph-edge', () => {
  const edges: TraceGraphEdge[] = [
    {
      from_agent: 'agent://a',
      to_agent: 'agent://b',
      kind: 'subtask',
      capability: 'echo',
      message_count: 1,
    },
    {
      from_agent: 'agent://b',
      to_agent: 'agent://c',
      kind: 'delegates',
      message_count: 4,
    },
    {
      from_agent: 'agent://c',
      to_agent: 'agent://a',
      kind: 'responds_to',
      message_count: 2,
    },
  ];

  it('scales stroke width by message count', () => {
    const max = maxOpsEdgeMessageCount(edges);
    expect(max).toBe(4);
    expect(computeOpsEdgeStrokeWidth(1, max)).toBeLessThan(computeOpsEdgeStrokeWidth(4, max));
  });

  it('assigns kind colors and selection accent', () => {
    const max = maxOpsEdgeMessageCount(edges);
    const subtask = resolveOpsEdgeVisualStyle({
      kind: 'subtask',
      messageCount: 1,
      maxMessageCount: max,
      touchesSelection: false,
      isDimmed: false,
    });
    const selected = resolveOpsEdgeVisualStyle({
      kind: 'delegates',
      messageCount: 4,
      maxMessageCount: max,
      touchesSelection: true,
      isDimmed: false,
    });

    expect(subtask.strokeColor).toBe('#5b9cf5');
    expect(selected.strokeColor).toBe('var(--oacp-accent)');
    expect(selected.strokeWidth).toBeGreaterThan(subtask.strokeWidth);
  });

  it('lists edge kinds present in graph with canonical order', () => {
    expect(listOpsEdgeKindsInGraph(edges)).toEqual(['subtask', 'delegates', 'responds_to']);
  });
});
