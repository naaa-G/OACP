import { describe, expect, it } from 'vitest';

import type { AgentIdentity, TraceBundle } from '@oacp/core';

import {
  activeAgentIdsFromTrace,
  enrichAgentsForSnapshot,
  parseAgentFleet,
  parseAgentRole,
} from '../src/observability/agent-enrichment.js';

function agent(overrides: Partial<AgentIdentity> = {}): AgentIdentity {
  return {
    id: 'agent://worker',
    name: 'Worker',
    version: '1.0',
    capabilities: ['echo'],
    publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'abc' },
    ...overrides,
  };
}

const traceBundle: TraceBundle = {
  trace_id: 'trace-1',
  started_at: '2026-01-01T00:00:00.000Z',
  last_activity_at: '2026-01-01T00:02:00.000Z',
  message_count: 2,
  message_types: ['task_request', 'task_response'],
  agents: ['agent://coordinator', 'agent://worker'],
  messages: [],
  timeline: [
    {
      index: 0,
      timestamp: '2026-01-01T00:00:10.000Z',
      type: 'task_request',
      from: 'agent://coordinator',
      to: 'agent://worker',
      message_id: 'msg-1',
      summary: 'delegate',
    },
    {
      index: 1,
      timestamp: '2026-01-01T00:01:00.000Z',
      type: 'task_response',
      from: 'agent://worker',
      status: 'success',
      message_id: 'msg-2',
      summary: 'done',
    },
  ],
};

describe('parseAgentFleet / parseAgentRole', () => {
  it('reads fleet and role from metadata', () => {
    const metadata = { fleet: 'mcplab', role: 'planner' };
    expect(parseAgentFleet(metadata)).toBe('mcplab');
    expect(parseAgentRole(metadata)).toBe('planner');
  });

  it('ignores empty or non-string metadata values', () => {
    expect(parseAgentFleet({ fleet: '  ' })).toBeUndefined();
    expect(parseAgentRole({ role: 42 })).toBeUndefined();
  });
});

describe('activeAgentIdsFromTrace', () => {
  it('collects roster and timeline participants', () => {
    const ids = activeAgentIdsFromTrace(traceBundle);
    expect([...ids].sort()).toEqual(['agent://coordinator', 'agent://worker']);
  });
});

describe('enrichAgentsForSnapshot', () => {
  it('adds fleet, role, active status, and last_seen_at', () => {
    const agents = [
      agent({
        id: 'agent://mcplab-planner',
        metadata: { fleet: 'mcplab', role: 'planner' },
      }),
      agent({ id: 'agent://idle-agent' }),
    ];

    const enriched = enrichAgentsForSnapshot({
      agents,
      traces: [
        {
          traceId: 'trace-1',
          startedAt: '2026-01-01T00:00:00.000Z',
          lastActivityAt: '2026-01-01T00:02:00.000Z',
          messageCount: 2,
          messageTypes: ['task_request'],
          agents: ['agent://mcplab-planner', 'agent://coordinator'],
        },
      ],
      activeTrace: traceBundle,
      activeAgentIds: activeAgentIdsFromTrace(traceBundle),
    });

    const planner = enriched.find((row) => row.id === 'agent://mcplab-planner');
    const idle = enriched.find((row) => row.id === 'agent://idle-agent');

    expect(planner).toMatchObject({
      fleet: 'mcplab',
      role: 'planner',
      status: 'idle',
      last_seen_at: '2026-01-01T00:02:00.000Z',
    });

    expect(idle).toMatchObject({
      status: 'idle',
    });
    expect(idle?.fleet).toBeUndefined();
  });

  it('infers fleet and role for MCPLab agent URIs without metadata', () => {
    const enriched = enrichAgentsForSnapshot({
      agents: [
        agent({
          id: 'agent://mcplab-researcher-crew-demo',
          name: 'Researcher (crew demo)',
        }),
      ],
      traces: [],
      activeTrace: undefined,
      activeAgentIds: new Set(),
    });

    expect(enriched[0]).toMatchObject({
      fleet: 'mcplab',
      role: 'researcher',
      status: 'idle',
    });
  });

  it('marks trace participants as active', () => {
    const enriched = enrichAgentsForSnapshot({
      agents: [agent({ id: 'agent://worker' }), agent({ id: 'agent://coordinator' })],
      traces: [],
      activeTrace: traceBundle,
      activeAgentIds: activeAgentIdsFromTrace(traceBundle),
    });

    expect(enriched.find((row) => row.id === 'agent://worker')?.status).toBe('active');
    expect(enriched.find((row) => row.id === 'agent://coordinator')?.status).toBe('active');
  });

  it('marks agents with error responses as error when active in trace', () => {
    const errorTrace: TraceBundle = {
      ...traceBundle,
      timeline: [
        {
          index: 0,
          timestamp: '2026-01-01T00:00:10.000Z',
          type: 'task_response',
          from: 'agent://worker',
          status: 'error',
          message_id: 'msg-err',
          summary: 'failed',
        },
      ],
    };

    const enriched = enrichAgentsForSnapshot({
      agents: [agent({ id: 'agent://worker' })],
      traces: [],
      activeTrace: errorTrace,
      activeAgentIds: new Set(['agent://worker']),
    });

    expect(enriched[0]?.status).toBe('error');
  });
});
