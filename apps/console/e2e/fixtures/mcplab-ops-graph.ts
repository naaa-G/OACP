import type { PlaygroundSnapshot, TraceGraphView } from '@oacp/observability-client';

/** MCPLab crew trace id for ops graph e2e (Day 35). */
export const MCPLAB_E2E_TRACE_ID = 'mcplab-crew-trace-0000-4000-8000-000000000042';

const publicKey = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'mcplab-e2e-public-key',
} as const;

const MCPLAB_AGENTS = [
  {
    id: 'agent://mcplab-coordinator-crew-demo',
    name: 'Coordinator',
    role: 'coordinator',
    capabilities: ['orchestrate'],
  },
  {
    id: 'agent://mcplab-planner-crew-demo',
    name: 'Planner',
    role: 'planner',
    capabilities: ['plan'],
  },
  {
    id: 'agent://mcplab-researcher-crew-demo',
    name: 'Researcher',
    role: 'researcher',
    capabilities: ['research'],
  },
  {
    id: 'agent://mcplab-synthesizer-crew-demo',
    name: 'Synthesizer',
    role: 'synthesizer',
    capabilities: ['synthesize'],
  },
  {
    id: 'agent://mcplab-coder-crew-demo',
    name: 'Coder',
    role: 'coder',
    capabilities: ['code'],
  },
] as const;

/** Five-agent MCPLab crew snapshot for ops graph acceptance (Day 35). */
export function buildMcplabE2eSnapshot(): PlaygroundSnapshot {
  const agentRecords = MCPLAB_AGENTS.map((agent) => ({
    id: agent.id,
    name: agent.name,
    version: '1.0',
    capabilities: [...agent.capabilities],
    publicKey,
    status: 'active' as const,
    fleet: 'mcplab',
    role: agent.role,
    metadata: { fleet: 'mcplab', role: agent.role },
  }));

  return {
    server: {
      status: 'healthy',
      protocol_version: '1.0',
      registered_agents: agentRecords.length,
      bus_open: true,
    },
    agents: agentRecords,
    traces: [
      {
        traceId: MCPLAB_E2E_TRACE_ID,
        startedAt: '2026-06-20T10:00:00.000Z',
        lastActivityAt: '2026-06-20T10:00:05.000Z',
        messageCount: 4,
        messageTypes: ['task_request', 'task_response'],
        agents: MCPLAB_AGENTS.map((agent) => agent.id),
      },
    ],
    trace_count: 1,
    active_trace: {
      trace_id: MCPLAB_E2E_TRACE_ID,
      started_at: '2026-06-20T10:00:00.000Z',
      last_activity_at: '2026-06-20T10:00:05.000Z',
      message_count: 4,
      message_types: ['task_request', 'task_response'],
      agents: MCPLAB_AGENTS.map((agent) => agent.id),
      timeline: [
        {
          index: 0,
          timestamp: '2026-06-20T10:00:01.000Z',
          type: 'task_request',
          from: MCPLAB_AGENTS[0]!.id,
          to: MCPLAB_AGENTS[1]!.id,
          capability: 'plan',
          message_id: 'mcplab-msg-1',
          summary: 'task_request from coordinator',
        },
        {
          index: 1,
          timestamp: '2026-06-20T10:00:02.000Z',
          type: 'task_request',
          from: MCPLAB_AGENTS[1]!.id,
          to: MCPLAB_AGENTS[2]!.id,
          capability: 'research',
          message_id: 'mcplab-msg-2',
          summary: 'task_request from planner',
        },
        {
          index: 2,
          timestamp: '2026-06-20T10:00:03.000Z',
          type: 'task_request',
          from: MCPLAB_AGENTS[2]!.id,
          to: MCPLAB_AGENTS[3]!.id,
          capability: 'synthesize',
          message_id: 'mcplab-msg-3',
          summary: 'task_request from researcher',
        },
        {
          index: 3,
          timestamp: '2026-06-20T10:00:04.000Z',
          type: 'task_request',
          from: MCPLAB_AGENTS[0]!.id,
          to: MCPLAB_AGENTS[4]!.id,
          capability: 'code',
          message_id: 'mcplab-msg-4',
          summary: 'task_request from coordinator',
        },
      ],
    },
    agent_links: [
      {
        from_agent: MCPLAB_AGENTS[0]!.id,
        to_agent: MCPLAB_AGENTS[1]!.id,
        kind: 'subtask',
        capability: 'plan',
        message_count: 1,
      },
      {
        from_agent: MCPLAB_AGENTS[1]!.id,
        to_agent: MCPLAB_AGENTS[2]!.id,
        kind: 'subtask',
        capability: 'research',
        message_count: 1,
      },
      {
        from_agent: MCPLAB_AGENTS[2]!.id,
        to_agent: MCPLAB_AGENTS[3]!.id,
        kind: 'subtask',
        capability: 'synthesize',
        message_count: 1,
      },
      {
        from_agent: MCPLAB_AGENTS[0]!.id,
        to_agent: MCPLAB_AGENTS[4]!.id,
        kind: 'subtask',
        capability: 'code',
        message_count: 1,
      },
    ],
  };
}

export function buildMcplabE2eTraceGraph(): TraceGraphView {
  const snapshot = buildMcplabE2eSnapshot();
  const nodes = MCPLAB_AGENTS.map((agent, index) => ({
    agent_id: agent.id,
    name: agent.name,
    depth: index === 0 ? 0 : index <= 3 ? index : 1,
    fleet: 'mcplab',
    role: agent.role,
    status: 'active' as const,
    capabilities: [...agent.capabilities],
  }));

  return {
    trace_id: MCPLAB_E2E_TRACE_ID,
    layout: 'hierarchical',
    max_depth: 3,
    nodes,
    edges: (snapshot.agent_links ?? []).map((link) => ({
      from_agent: link.from_agent,
      to_agent: link.to_agent,
      kind: link.kind,
      ...(link.capability !== undefined ? { capability: link.capability } : {}),
      message_count: link.message_count,
    })),
  };
}

export { MCPLAB_AGENTS };
