import { describe, expect, it } from 'vitest';

import type { AgentObservabilityRecord } from '@oacp/observability-client';

import { searchAgents } from './agent-search.js';

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

describe('searchAgents', () => {
  const catalog = [
    agent({ id: 'agent://worker', name: 'Worker', role: 'coder', fleet: 'mcplab' }),
    agent({
      id: 'agent://startup-coder',
      name: 'Startup Coder',
      role: 'coder',
      fleet: 'startup-demo',
    }),
    agent({ id: 'agent://idle-planner', name: 'Idle Planner', role: 'planner', fleet: 'mcplab' }),
    agent({
      id: 'agent://orphan-agent',
      name: 'Orphan Agent',
      capabilities: ['implement-widget'],
    }),
  ] as const;

  it('returns all agents for an empty query', () => {
    expect(searchAgents(catalog, '').map((row) => row.agent.id)).toHaveLength(4);
  });

  it('matches coder roles across fleets', () => {
    const results = searchAgents(catalog, 'coder');
    expect(results.map((row) => row.agent.id).sort()).toEqual(
      ['agent://orphan-agent', 'agent://startup-coder', 'agent://worker'].sort(),
    );
  });

  it('supports multi-token queries', () => {
    const results = searchAgents(catalog, 'startup coder');
    expect(results.map((row) => row.agent.id)).toEqual(['agent://startup-coder']);
  });

  it('matches fuzzy subsequence tokens', () => {
    const results = searchAgents(catalog, 'plnr');
    expect(results.map((row) => row.agent.id)).toEqual(['agent://idle-planner']);
  });

  it('returns highlight ranges for substring matches', () => {
    const match = searchAgents(catalog, 'coder').find(
      (row) => row.agent.id === 'agent://startup-coder',
    );
    expect(match?.highlights.name.length).toBeGreaterThan(0);
  });

  it('filters large catalogs under 100ms', () => {
    const largeCatalog = Array.from({ length: 500 }, (_, index) =>
      agent({
        id: `agent://agent-${index}`,
        name: `Agent ${index}`,
        role: index % 5 === 0 ? 'coder' : 'planner',
        fleet: index % 2 === 0 ? 'mcplab' : 'startup-demo',
        capabilities: index % 3 === 0 ? ['code', 'plan'] : ['plan'],
      }),
    );

    const started = performance.now();
    const results = searchAgents(largeCatalog, 'coder');
    const elapsed = performance.now() - started;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100);
  });
});
