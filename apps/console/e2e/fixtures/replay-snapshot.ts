import type { PlaygroundSnapshot, TraceGraphView } from '@oacp/observability-client';

import { E2E_TRACE_ID } from './snapshot.js';

export const E2E_REPLAY_TRACE_ID = 'replay-3msg-trace-0000-4000-8000-000000000001';

const E2E_AGENT_COORDINATOR = 'agent://coordinator';
const E2E_AGENT_WORKER = 'agent://worker';
const E2E_AGENT_PLANNER = 'agent://idle-planner';

const publicKey = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'e2e-replay-public-key',
} as const;

/** Three-message trace for Day 33 replay scrubber e2e. */
export function buildE2eReplaySnapshot(): PlaygroundSnapshot {
  return {
    server: {
      status: 'healthy',
      protocol_version: '1.0',
      registered_agents: 3,
      bus_open: true,
    },
    agents: [
      {
        id: E2E_AGENT_COORDINATOR,
        name: 'Coordinator',
        version: '1.0',
        capabilities: ['orchestrate'],
        publicKey,
        status: 'active',
        fleet: 'mcplab',
        role: 'coordinator',
      },
      {
        id: E2E_AGENT_WORKER,
        name: 'Worker',
        version: '1.0',
        capabilities: ['echo'],
        publicKey,
        status: 'active',
        fleet: 'mcplab',
        role: 'coder',
      },
      {
        id: E2E_AGENT_PLANNER,
        name: 'Idle Planner',
        version: '1.0',
        capabilities: ['plan'],
        publicKey,
        status: 'active',
        fleet: 'mcplab',
        role: 'planner',
      },
    ],
    traces: [
      {
        traceId: E2E_REPLAY_TRACE_ID,
        startedAt: '2026-06-20T00:00:00.000Z',
        lastActivityAt: '2026-06-20T00:00:02.000Z',
        messageCount: 3,
        messageTypes: ['task_request', 'task_response'],
        agents: [E2E_AGENT_COORDINATOR, E2E_AGENT_WORKER, E2E_AGENT_PLANNER],
      },
      {
        traceId: E2E_TRACE_ID,
        startedAt: '2026-06-20T00:01:00.000Z',
        lastActivityAt: '2026-06-20T00:01:00.000Z',
        messageCount: 2,
        messageTypes: ['task_request', 'task_response'],
        agents: [E2E_AGENT_COORDINATOR, E2E_AGENT_WORKER],
      },
    ],
    trace_count: 2,
    active_trace: {
      trace_id: E2E_REPLAY_TRACE_ID,
      started_at: '2026-06-20T00:00:00.000Z',
      last_activity_at: '2026-06-20T00:00:02.000Z',
      message_count: 3,
      message_types: ['task_request', 'task_response'],
      agents: [E2E_AGENT_COORDINATOR, E2E_AGENT_WORKER, E2E_AGENT_PLANNER],
      timeline: [
        {
          index: 0,
          timestamp: '2026-06-20T00:00:00.000Z',
          type: 'task_request',
          from: E2E_AGENT_COORDINATOR,
          to: E2E_AGENT_WORKER,
          capability: 'echo',
          message_id: 'replay-msg-1',
          summary: 'task_request from coordinator',
        },
        {
          index: 1,
          timestamp: '2026-06-20T00:00:01.000Z',
          type: 'task_response',
          from: E2E_AGENT_WORKER,
          status: 'success',
          message_id: 'replay-msg-2',
          summary: 'task_response (success)',
        },
        {
          index: 2,
          timestamp: '2026-06-20T00:00:02.000Z',
          type: 'task_request',
          from: E2E_AGENT_COORDINATOR,
          to: E2E_AGENT_PLANNER,
          capability: 'plan',
          message_id: 'replay-msg-3',
          summary: 'task_request from coordinator',
        },
      ],
    },
    agent_links: [
      {
        from_agent: E2E_AGENT_COORDINATOR,
        to_agent: E2E_AGENT_WORKER,
        kind: 'subtask',
        capability: 'echo',
        message_count: 1,
      },
      {
        from_agent: E2E_AGENT_COORDINATOR,
        to_agent: E2E_AGENT_PLANNER,
        kind: 'subtask',
        capability: 'plan',
        message_count: 1,
      },
    ],
  };
}

export function buildE2eReplayTraceGraph(): TraceGraphView {
  const snapshot = buildE2eReplaySnapshot();

  return {
    trace_id: E2E_REPLAY_TRACE_ID,
    layout: 'hierarchical',
    max_depth: 1,
    nodes: [
      {
        agent_id: E2E_AGENT_COORDINATOR,
        name: 'Coordinator',
        depth: 0,
        fleet: 'mcplab',
        role: 'coordinator',
        status: 'active',
        capabilities: ['orchestrate'],
      },
      {
        agent_id: E2E_AGENT_WORKER,
        name: 'Worker',
        depth: 1,
        fleet: 'mcplab',
        role: 'coder',
        status: 'active',
        capabilities: ['echo'],
      },
      {
        agent_id: E2E_AGENT_PLANNER,
        name: 'Idle Planner',
        depth: 1,
        fleet: 'mcplab',
        role: 'planner',
        status: 'active',
        capabilities: ['plan'],
      },
    ],
    edges: (snapshot.agent_links ?? []).map((link) => ({
      from_agent: link.from_agent,
      to_agent: link.to_agent,
      kind: link.kind,
      ...(link.capability !== undefined ? { capability: link.capability } : {}),
      message_count: link.message_count,
    })),
  };
}

export {
  E2E_AGENT_COORDINATOR as E2E_REPLAY_COORDINATOR,
  E2E_AGENT_PLANNER as E2E_REPLAY_PLANNER,
  E2E_AGENT_WORKER as E2E_REPLAY_WORKER,
};
