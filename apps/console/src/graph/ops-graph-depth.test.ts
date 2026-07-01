import { describe, expect, it } from 'vitest';

import { assignTraceGraphNodeDepths, computeOpsGraphAgentDepths } from './ops-graph-depth.js';

describe('computeOpsGraphAgentDepths', () => {
  it('assigns depth 0 to roots and increments along subtask edges', () => {
    const depths = computeOpsGraphAgentDepths(
      ['agent://coordinator', 'agent://worker', 'agent://coder'],
      [
        {
          from_agent: 'agent://coordinator',
          to_agent: 'agent://worker',
          kind: 'subtask',
        },
        {
          from_agent: 'agent://worker',
          to_agent: 'agent://coder',
          kind: 'subtask',
        },
      ],
    );

    expect(depths.get('agent://coordinator')).toBe(0);
    expect(depths.get('agent://worker')).toBe(1);
    expect(depths.get('agent://coder')).toBe(2);
  });

  it('ignores responds_to edges for hierarchy depth', () => {
    const depths = computeOpsGraphAgentDepths(
      ['agent://coordinator', 'agent://worker'],
      [
        {
          from_agent: 'agent://coordinator',
          to_agent: 'agent://worker',
          kind: 'subtask',
        },
        {
          from_agent: 'agent://worker',
          to_agent: 'agent://coordinator',
          kind: 'responds_to',
        },
      ],
    );

    expect(depths.get('agent://coordinator')).toBe(0);
    expect(depths.get('agent://worker')).toBe(1);
  });

  it('picks shortest path when multiple delegation routes exist', () => {
    const depths = computeOpsGraphAgentDepths(
      ['agent://a', 'agent://b', 'agent://c'],
      [
        { from_agent: 'agent://a', to_agent: 'agent://b', kind: 'subtask' },
        { from_agent: 'agent://b', to_agent: 'agent://c', kind: 'subtask' },
        { from_agent: 'agent://a', to_agent: 'agent://c', kind: 'delegates' },
      ],
    );

    expect(depths.get('agent://c')).toBe(1);
  });
});

describe('assignTraceGraphNodeDepths', () => {
  it('returns nodes with recomputed depth field', () => {
    const nodes = assignTraceGraphNodeDepths(
      [
        {
          agent_id: 'agent://coordinator',
          name: 'Coordinator',
          depth: 99,
          status: 'active' as const,
          capabilities: [],
        },
        {
          agent_id: 'agent://worker',
          name: 'Worker',
          depth: 99,
          status: 'active' as const,
          capabilities: [],
        },
      ],
      [
        {
          from_agent: 'agent://coordinator',
          to_agent: 'agent://worker',
          kind: 'subtask',
          message_count: 1,
        },
      ],
    );

    expect(nodes[0]?.depth).toBe(0);
    expect(nodes[1]?.depth).toBe(1);
  });
});
