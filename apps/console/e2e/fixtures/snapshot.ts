import type { PlaygroundSnapshot } from '@oacp/observability-client';

/** Fixed trace id for Playwright smoke tests. */
export const E2E_TRACE_ID = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c66';

export const E2E_SECOND_TRACE_ID = '1a2b3c4d-5e6f-7890-abcd-ef1234567890';

const publicKey = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'e2e-test-public-key',
} as const;

export function buildE2eSnapshot(traceId: string = E2E_TRACE_ID): PlaygroundSnapshot {
  const idleAgents = [
    {
      id: 'agent://idle-planner',
      name: 'Idle Planner',
      version: '1.0',
      capabilities: ['plan'],
      publicKey,
      fleet: 'mcplab',
      role: 'planner',
      metadata: { fleet: 'mcplab', role: 'planner' },
    },
    {
      id: 'agent://idle-researcher',
      name: 'Idle Researcher',
      version: '1.0',
      capabilities: ['research'],
      publicKey,
      fleet: 'mcplab',
      role: 'researcher',
      metadata: { fleet: 'mcplab', role: 'researcher' },
    },
    {
      id: 'agent://startup-coder',
      name: 'Startup Coder',
      version: '1.0',
      capabilities: ['code'],
      publicKey,
      fleet: 'startup-demo',
      role: 'coder',
      metadata: { fleet: 'startup-demo', role: 'coder' },
    },
    {
      id: 'agent://startup-pm',
      name: 'Startup PM',
      version: '1.0',
      capabilities: ['plan'],
      publicKey,
      fleet: 'startup-demo',
      role: 'pm',
      metadata: { fleet: 'startup-demo', role: 'pm' },
    },
    {
      id: 'agent://orphan-agent',
      name: 'Orphan Agent',
      version: '1.0',
      capabilities: ['implement-widget'],
      publicKey,
    },
  ] as const;

  const traceAgents =
    traceId === E2E_SECOND_TRACE_ID
      ? (['agent://coordinator'] as const)
      : (['agent://coordinator', 'agent://worker'] as const);

  return {
    server: {
      status: 'healthy',
      protocol_version: '1.0',
      registered_agents: 2 + idleAgents.length,
      bus_open: true,
    },
    agents: [
      {
        id: 'agent://coordinator',
        name: 'Coordinator',
        version: '1.0',
        capabilities: ['orchestrate'],
        publicKey,
        status: 'active',
        fleet: 'mcplab',
        role: 'coordinator',
        metadata: { fleet: 'mcplab', role: 'coordinator' },
      },
      {
        id: 'agent://worker',
        name: 'Worker',
        version: '1.0',
        capabilities: ['echo'],
        publicKey,
        status: 'active',
        fleet: 'mcplab',
        role: 'coder',
        metadata: { fleet: 'mcplab', role: 'coder' },
      },
      ...idleAgents,
    ],
    traces: [
      {
        traceId: E2E_TRACE_ID,
        startedAt: '2026-06-20T00:00:00.000Z',
        lastActivityAt: '2026-06-20T00:01:00.000Z',
        completedAt: '2026-06-20T00:01:00.000Z',
        status: 'completed',
        messageCount: 3,
        messageTypes: ['task_request', 'delegation', 'task_response'],
        agents: ['agent://coordinator', 'agent://worker'],
      },
      {
        traceId: E2E_SECOND_TRACE_ID,
        startedAt: '2026-06-20T00:02:00.000Z',
        lastActivityAt: '2026-06-20T00:03:00.000Z',
        status: 'running',
        messageCount: 1,
        messageTypes: ['task_request'],
        agents: ['agent://coordinator'],
      },
    ],
    trace_count: 2,
    active_trace: {
      trace_id: traceId,
      started_at: '2026-06-20T00:00:00.000Z',
      last_activity_at: '2026-06-20T00:01:00.000Z',
      message_count: 3,
      message_types: ['task_request', 'delegation', 'task_response'],
      agents: [...traceAgents],
      timeline:
        traceId === E2E_SECOND_TRACE_ID
          ? [
              {
                index: 0,
                timestamp: '2026-06-20T00:02:10.000Z',
                type: 'task_request',
                from: 'agent://coordinator',
                capability: 'orchestrate',
                message_id: 'msg-second-1',
                summary: 'task_request from coordinator',
              },
            ]
          : [
              {
                index: 0,
                timestamp: '2026-06-20T00:00:10.000Z',
                type: 'task_request',
                from: 'agent://coordinator',
                to: 'agent://worker',
                capability: 'echo',
                message_id: 'msg-request-1',
                summary: 'task_request from coordinator',
              },
              {
                index: 1,
                timestamp: '2026-06-20T00:00:15.000Z',
                type: 'delegation',
                from: 'agent://coordinator',
                to: 'agent://worker',
                capability: 'echo',
                message_id: 'msg-delegation-1',
                summary: 'delegation from coordinator',
              },
              {
                index: 2,
                timestamp: '2026-06-20T00:00:20.000Z',
                type: 'task_response',
                from: 'agent://worker',
                status: 'success',
                message_id: 'msg-response-1',
                summary: 'task_response (success)',
              },
            ],
    },
    agent_links:
      traceId === E2E_SECOND_TRACE_ID
        ? []
        : [
            {
              from_agent: 'agent://coordinator',
              to_agent: 'agent://worker',
              kind: 'subtask',
              capability: 'echo',
              message_count: 1,
            },
          ],
  };
}
