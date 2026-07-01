import { describe, expect, it } from 'vitest';

import { buildTraceGraphFromSnapshot } from './trace-graph-from-snapshot.js';

describe('buildTraceGraphFromSnapshot', () => {
  it('builds hierarchical nodes from snapshot roster and agent links', () => {
    const graph = buildTraceGraphFromSnapshot({
      traceId: 'trace-1',
      agents: [
        {
          id: 'agent://coordinator',
          name: 'Coordinator',
          version: '1.0',
          capabilities: ['orchestrate'],
          publicKey: 'pk',
          status: 'active',
          fleet: 'mcplab',
          role: 'coordinator',
        },
        {
          id: 'agent://worker',
          name: 'Worker',
          version: '1.0',
          capabilities: ['work'],
          publicKey: 'pk',
          status: 'active',
          fleet: 'mcplab',
          role: 'worker',
        },
      ],
      agentLinks: [
        {
          from_agent: 'agent://coordinator',
          to_agent: 'agent://worker',
          kind: 'subtask',
          message_count: 2,
        },
      ],
      participantIds: new Set(['agent://coordinator', 'agent://worker']),
    });

    expect(graph?.trace_id).toBe('trace-1');
    expect(graph?.nodes).toHaveLength(2);
    expect(graph?.nodes[0]?.agent_id).toBe('agent://coordinator');
    expect(graph?.nodes[0]?.depth).toBe(0);
    expect(graph?.nodes[1]?.depth).toBe(1);
    expect(graph?.edges).toHaveLength(1);
  });
});
