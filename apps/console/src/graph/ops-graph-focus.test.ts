import { describe, expect, it } from 'vitest';

import type { TraceGraphEdge } from '@oacp/observability-client';

import {
  buildOpsGraphFocusScope,
  computeOpsGraphFocusNeighborhood,
  OPS_GRAPH_FOCUS_DIM_OPACITY,
  resolveOpsGraphEdgeFocusState,
  resolveOpsGraphNodeFocusRole,
} from './ops-graph-focus.js';

const EDGES: TraceGraphEdge[] = [
  {
    from_agent: 'agent://coordinator',
    to_agent: 'agent://planner',
    kind: 'subtask',
    message_count: 1,
  },
  {
    from_agent: 'agent://planner',
    to_agent: 'agent://coder',
    kind: 'subtask',
    message_count: 1,
  },
];

describe('ops-graph-focus', () => {
  it('exports enterprise dim opacity', () => {
    expect(OPS_GRAPH_FOCUS_DIM_OPACITY).toBe(0.2);
  });

  it('computes undirected 1-hop neighborhood', () => {
    const neighborhood = computeOpsGraphFocusNeighborhood('agent://coordinator', EDGES);
    expect([...neighborhood].sort()).toEqual(['agent://coordinator', 'agent://planner'].sort());
  });

  it('classifies node roles within focus scope', () => {
    const scope = buildOpsGraphFocusScope('agent://coordinator', EDGES);
    expect(scope).toBeDefined();
    expect(resolveOpsGraphNodeFocusRole('agent://coordinator', scope)).toBe('focused');
    expect(resolveOpsGraphNodeFocusRole('agent://planner', scope)).toBe('neighbor');
    expect(resolveOpsGraphNodeFocusRole('agent://coder', scope)).toBe('dimmed');
  });

  it('emphasizes only in/out edges of the focused agent', () => {
    const scope = buildOpsGraphFocusScope('agent://coordinator', EDGES);

    expect(resolveOpsGraphEdgeFocusState('agent://coordinator', 'agent://planner', scope)).toEqual({
      touchesFocus: true,
      isDimmed: false,
    });

    expect(resolveOpsGraphEdgeFocusState('agent://planner', 'agent://coder', scope)).toEqual({
      touchesFocus: false,
      isDimmed: true,
    });
  });

  it('returns neutral roles when focus is inactive', () => {
    expect(resolveOpsGraphNodeFocusRole('agent://coder', undefined)).toBe('none');
    expect(resolveOpsGraphEdgeFocusState('agent://planner', 'agent://coder', undefined)).toEqual({
      touchesFocus: false,
      isDimmed: false,
    });
  });
});
