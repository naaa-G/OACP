import { describe, expect, it } from 'vitest';

import type { AgentObservabilityRecord, TraceListEntry } from '@oacp/observability-client';

import {
  collectAgentMessages,
  collectAgentRecentTraces,
  formatPublicKeyFingerprint,
  resolveMcplabAgentConfigUrl,
} from './agent-detail.js';

function agent(
  partial: Partial<AgentObservabilityRecord> & Pick<AgentObservabilityRecord, 'id'>,
): AgentObservabilityRecord {
  return {
    name: partial.id,
    version: '1.0',
    capabilities: [],
    publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'e2e-test-public-key-material' },
    ...partial,
  };
}

describe('formatPublicKeyFingerprint', () => {
  it('truncates long JWK material', () => {
    expect(
      formatPublicKeyFingerprint({
        kty: 'OKP',
        crv: 'Ed25519',
        x: 'abcdefghijklmnopqrstuvwxyz',
      }),
    ).toBe('abcdefgh…wxyz');
  });
});

describe('collectAgentRecentTraces', () => {
  const traces: TraceListEntry[] = [
    {
      traceId: 'trace-old',
      startedAt: '2026-06-19T00:00:00.000Z',
      lastActivityAt: '2026-06-19T00:01:00.000Z',
      messageCount: 1,
      messageTypes: ['task_request'],
      agents: ['agent://worker'],
    },
    {
      traceId: 'trace-new',
      startedAt: '2026-06-20T00:00:00.000Z',
      lastActivityAt: '2026-06-20T00:02:00.000Z',
      messageCount: 2,
      messageTypes: ['task_request', 'task_response'],
      agents: ['agent://worker', 'agent://coordinator'],
    },
  ];

  it('returns traces sorted by last activity', () => {
    const recent = collectAgentRecentTraces('agent://worker', traces);
    expect(recent.map((row) => row.traceId)).toEqual(['trace-new', 'trace-old']);
  });
});

describe('collectAgentMessages', () => {
  it('collects inbound and outbound messages for an agent', () => {
    const messages = collectAgentMessages('agent://worker', [
      {
        index: 0,
        timestamp: '2026-06-20T00:00:00.000Z',
        type: 'task_request',
        from: 'agent://coordinator',
        to: 'agent://worker',
        message_id: 'm1',
        summary: 'request',
      },
      {
        index: 1,
        timestamp: '2026-06-20T00:00:01.000Z',
        type: 'task_response',
        from: 'agent://worker',
        to: 'agent://coordinator',
        message_id: 'm2',
        summary: 'response',
      },
    ]);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.direction).toBe('in');
    expect(messages[1]?.direction).toBe('out');
  });
});

describe('resolveMcplabAgentConfigUrl', () => {
  it('returns undefined for non-mcplab fleets', () => {
    expect(
      resolveMcplabAgentConfigUrl(agent({ id: 'agent://startup-pm', fleet: 'startup-demo' })),
    ).toBeUndefined();
  });

  it('prefers explicit metadata config_url', () => {
    expect(
      resolveMcplabAgentConfigUrl(
        agent({
          id: 'agent://mcplab-planner',
          fleet: 'mcplab',
          metadata: { config_url: 'https://lab.example/agents/planner' },
        }),
        'http://127.0.0.1:8080',
      ),
    ).toBe('https://lab.example/agents/planner');
  });

  it('builds convention URL from agent slug', () => {
    expect(
      resolveMcplabAgentConfigUrl(
        agent({ id: 'agent://mcplab-planner-crew-demo', fleet: 'mcplab' }),
        'http://127.0.0.1:8080',
      ),
    ).toBe('http://127.0.0.1:8080/agents/mcplab-planner-crew-demo');
  });
});
