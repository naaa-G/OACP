import type { TraceGraphView } from '@oacp/observability-client';

import { buildE2eSnapshot, E2E_TRACE_ID } from './snapshot.js';

const E2E_AGENT_COORDINATOR = 'agent://coordinator';
const E2E_AGENT_WORKER = 'agent://worker';
const E2E_AGENT_PLANNER = 'agent://idle-planner';

/** Trace-scoped agent graph fixture for Ops mode e2e (Day 27). */
export function buildE2eTraceGraph(traceId: string = E2E_TRACE_ID): TraceGraphView {
  const snapshot = buildE2eSnapshot(traceId);
  const traceAgents = snapshot.active_trace?.agents ?? snapshot.traces[0]?.agents ?? [];

  const nodes = traceAgents.map((agentId) => {
    const registry = snapshot.agents.find((agent) => agent.id === agentId);
    const depth =
      agentId === E2E_AGENT_COORDINATOR
        ? 0
        : agentId === E2E_AGENT_WORKER
          ? 1
          : agentId === E2E_AGENT_PLANNER
            ? 1
            : 2;

    return {
      agent_id: agentId,
      name: registry?.name ?? agentId.replace(/^agent:\/\//, ''),
      depth,
      fleet: registry?.fleet,
      role: registry?.role,
      status: (registry?.status ?? 'active') as 'active',
      capabilities: registry?.capabilities ?? [],
    };
  });

  const edges = (snapshot.agent_links ?? []).map((link) => ({
    from_agent: link.from_agent,
    to_agent: link.to_agent,
    kind: link.kind,
    ...(link.capability !== undefined ? { capability: link.capability } : {}),
    message_count: link.message_count,
  }));

  if (edges.length === 0 && nodes.length >= 2) {
    edges.push({
      from_agent: E2E_AGENT_COORDINATOR,
      to_agent: E2E_AGENT_WORKER,
      kind: 'subtask',
      capability: 'echo',
      message_count: 1,
    });
  }

  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);

  return {
    trace_id: traceId,
    layout: 'hierarchical',
    max_depth: maxDepth,
    nodes,
    edges,
  };
}

/** Multi-fleet trace graph for Showcase fleet clustering e2e (Day 42). */
export function buildMultiFleetE2eTraceGraph(traceId: string = E2E_TRACE_ID): TraceGraphView {
  const nodes = [
    {
      agent_id: 'agent://mcplab-hub',
      name: 'MCPLab Hub',
      depth: 0,
      fleet: 'mcplab',
      role: 'coordinator',
      status: 'active' as const,
      capabilities: ['delegate'],
    },
    {
      agent_id: 'agent://mcplab-worker',
      name: 'MCPLab Worker',
      depth: 1,
      fleet: 'mcplab',
      role: 'worker',
      status: 'active' as const,
      capabilities: ['echo'],
    },
    {
      agent_id: 'agent://startup-hub',
      name: 'Startup Hub',
      depth: 0,
      fleet: 'startup-demo',
      role: 'coordinator',
      status: 'active' as const,
      capabilities: ['delegate'],
    },
    {
      agent_id: 'agent://startup-worker',
      name: 'Startup Worker',
      depth: 1,
      fleet: 'startup-demo',
      role: 'worker',
      status: 'active' as const,
      capabilities: ['echo'],
    },
  ];

  const edges = [
    {
      from_agent: 'agent://mcplab-hub',
      to_agent: 'agent://mcplab-worker',
      kind: 'subtask',
      capability: 'echo',
      message_count: 3,
    },
    {
      from_agent: 'agent://startup-hub',
      to_agent: 'agent://startup-worker',
      kind: 'subtask',
      capability: 'echo',
      message_count: 2,
    },
  ];

  return {
    trace_id: traceId,
    layout: 'hierarchical',
    max_depth: 1,
    nodes,
    edges,
  };
}
