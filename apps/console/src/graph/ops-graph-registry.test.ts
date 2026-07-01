import type { AgentObservabilityRecord, TraceGraphView } from '@oacp/observability-client';
import { describe, expect, it } from 'vitest';

import {
  countRegistryGhostAgents,
  listRegistryGhostAgents,
  mergeRegistryGhostsIntoGraph,
} from './ops-graph-registry.js';

const traceGraph: TraceGraphView = {
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
  ],
  edges: [
    {
      from_agent: 'agent://coordinator',
      to_agent: 'agent://worker',
      kind: 'subtask',
      message_count: 1,
    },
  ],
};

const registry: AgentObservabilityRecord[] = [
  {
    id: 'agent://coordinator',
    name: 'Coordinator',
    version: '1.0',
    capabilities: ['orchestrate'],
    publicKey: 'k',
  },
  {
    id: 'agent://worker',
    name: 'Worker',
    version: '1.0',
    capabilities: ['echo'],
    publicKey: 'k',
  },
  {
    id: 'agent://idle-planner',
    name: 'Idle Planner',
    version: '1.0',
    capabilities: ['plan'],
    publicKey: 'k',
    status: 'idle',
    fleet: 'mcplab',
    role: 'planner',
  },
];

describe('ops-graph-registry', () => {
  it('lists registry agents missing from trace graph', () => {
    expect(listRegistryGhostAgents(traceGraph, registry)).toHaveLength(1);
    expect(countRegistryGhostAgents(traceGraph, registry)).toBe(1);
  });

  it('merges ghost nodes without altering trace edges', () => {
    const merged = mergeRegistryGhostsIntoGraph(traceGraph, registry);
    expect(merged.ghostCount).toBe(1);
    expect(merged.graph.nodes).toHaveLength(3);
    expect(merged.graph.edges).toEqual(traceGraph.edges);
    expect(merged.ghostAgentIds.has('agent://idle-planner')).toBe(true);
  });
});
