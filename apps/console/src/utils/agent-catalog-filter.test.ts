import { describe, expect, it } from 'vitest';

import type { AgentObservabilityRecord, TraceTimelineEvent } from '@oacp/observability-client';

import {
  agentMatchesCatalogFilters,
  buildTraceActivityCounts,
  DEFAULT_AGENT_CATALOG_FILTERS,
  filterAgentsByCatalog,
  hasActiveCatalogFilters,
  sortAgentsForCatalog,
} from './agent-catalog-filter.js';

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

describe('filterAgentsByCatalog', () => {
  const catalog = [
    agent({ id: 'agent://planner', name: 'Idle Planner', role: 'planner', fleet: 'mcplab' }),
    agent({
      id: 'agent://worker',
      name: 'Worker',
      role: 'coder',
      fleet: 'mcplab',
      status: 'active',
    }),
    agent({ id: 'agent://startup-pm', name: 'Startup PM', fleet: 'startup-demo' }),
  ];

  const activeIds = new Set(['agent://worker']);

  it('filters by fleet bucket', () => {
    const filtered = filterAgentsByCatalog(
      catalog,
      { ...DEFAULT_AGENT_CATALOG_FILTERS, fleet: 'mcplab' },
      activeIds,
    );
    expect(filtered.map((row) => row.id)).toEqual(['agent://planner', 'agent://worker']);
  });

  it('filters by status and in-trace together', () => {
    const filtered = filterAgentsByCatalog(
      catalog,
      {
        ...DEFAULT_AGENT_CATALOG_FILTERS,
        statuses: ['active'],
        inTraceOnly: true,
      },
      activeIds,
    );
    expect(filtered.map((row) => row.id)).toEqual(['agent://worker']);
  });
});

describe('sortAgentsForCatalog', () => {
  it('sorts by trace activity descending', () => {
    const timeline: TraceTimelineEvent[] = [
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
      {
        index: 2,
        timestamp: '2026-06-20T00:00:02.000Z',
        type: 'task_request',
        from: 'agent://worker',
        to: 'agent://planner',
        message_id: 'm3',
        summary: 'delegate',
      },
    ];

    const counts = buildTraceActivityCounts(timeline);
    const sorted = sortAgentsForCatalog(
      [
        agent({ id: 'agent://planner', name: 'Planner' }),
        agent({ id: 'agent://worker', name: 'Worker' }),
      ],
      'activity',
      counts,
    );

    expect(sorted.map((row) => row.id)).toEqual(['agent://worker', 'agent://planner']);
  });
});

describe('hasActiveCatalogFilters', () => {
  it('detects non-default filter state', () => {
    expect(hasActiveCatalogFilters(DEFAULT_AGENT_CATALOG_FILTERS)).toBe(false);
    expect(hasActiveCatalogFilters({ ...DEFAULT_AGENT_CATALOG_FILTERS, fleet: 'mcplab' })).toBe(
      true,
    );
  });
});

describe('agentMatchesCatalogFilters', () => {
  it('treats trace participants as active for status filters', () => {
    const match = agentMatchesCatalogFilters(
      agent({ id: 'agent://worker', status: 'idle' }),
      { ...DEFAULT_AGENT_CATALOG_FILTERS, statuses: ['active'] },
      new Set(['agent://worker']),
    );
    expect(match).toBe(true);
  });
});
