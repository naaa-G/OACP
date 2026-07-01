import { describe, expect, it } from 'vitest';

import type { AgentObservabilityRecord } from '@oacp/observability-client';

import { collectRoleLegendEntries, resolveAgentRole, roleSearchTokens } from './role-taxonomy.js';

function agent(
  partial: Partial<AgentObservabilityRecord> & Pick<AgentObservabilityRecord, 'id'>,
): AgentObservabilityRecord {
  return {
    name: partial.id,
    version: '1.0',
    capabilities: [],
    publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'test' },
    ...partial,
  };
}

describe('resolveAgentRole', () => {
  it('prefers explicit metadata role', () => {
    const resolved = resolveAgentRole(
      agent({ id: 'agent://worker', role: 'coder', capabilities: ['plan'] }),
    );
    expect(resolved?.id).toBe('coder');
    expect(resolved?.label).toBe('Coder');
    expect(resolved?.source).toBe('metadata');
  });

  it('infers role from agent id and name', () => {
    const resolved = resolveAgentRole(
      agent({ id: 'agent://mcplab-planner-crew-demo', name: 'Planner (crew demo)' }),
    );
    expect(resolved?.id).toBe('planner');
    expect(resolved?.source).toBe('identity');
  });

  it('infers role from capability prefix when metadata is missing', () => {
    const resolved = resolveAgentRole(
      agent({
        id: 'agent://orphan-agent',
        name: 'Orphan Agent',
        capabilities: ['implement-feature'],
      }),
    );
    expect(resolved?.id).toBe('coder');
    expect(resolved?.source).toBe('capability');
  });

  it('returns undefined when no role signals exist', () => {
    expect(resolveAgentRole(agent({ id: 'agent://unknown', name: 'Unknown' }))).toBeUndefined();
  });
});

describe('collectRoleLegendEntries', () => {
  it('returns unique role and fleet pairs sorted by label', () => {
    const entries = collectRoleLegendEntries([
      agent({ id: 'agent://worker', role: 'coder', fleet: 'mcplab' }),
      agent({ id: 'agent://startup-coder', role: 'coder', fleet: 'startup-demo' }),
      agent({ id: 'agent://coordinator', role: 'coordinator', fleet: 'mcplab' }),
    ]);

    expect(entries.map((entry) => `${entry.fleetId}:${entry.role.id}`)).toEqual([
      'mcplab:coder',
      'startup-demo:coder',
      'mcplab:coordinator',
    ]);
  });
});

describe('roleSearchTokens', () => {
  it('includes resolved role id and label for search', () => {
    const tokens = roleSearchTokens(agent({ id: 'agent://worker', role: 'coder' }));
    expect(tokens).toContain('coder');
    expect(tokens).toContain('Coder');
  });
});
