import { describe, expect, it } from 'vitest';

import type { AgentObservabilityRecord, TraceTimelineEvent } from '@oacp/observability-client';

import { DEFAULT_AGENT_CATALOG_FILTERS, type AgentCatalogFilters } from './agent-catalog-filter.js';
import { buildAgentCatalogView } from './agent-catalog-pipeline.js';
import { resolveAgentTraceScope } from './agent-trace-filter.js';

const publicKey = { kty: 'OKP', crv: 'Ed25519', x: 'test' } as const;

function agent(
  partial: Partial<AgentObservabilityRecord> & Pick<AgentObservabilityRecord, 'id'>,
): AgentObservabilityRecord {
  return {
    name: partial.id,
    version: '1.0',
    capabilities: ['echo'],
    publicKey,
    ...partial,
  };
}

/** MCPLab demo scale — 27 agents across fleets and roles. */
function buildMcplabDemoCatalog(): {
  readonly agents: readonly AgentObservabilityRecord[];
  readonly activeAgentIds: ReadonlySet<string>;
  readonly timeline: readonly TraceTimelineEvent[];
} {
  const roles = ['planner', 'coder', 'researcher', 'analyst', 'coordinator'] as const;
  const mcplabAgents = Array.from({ length: 22 }, (_, index) => {
    const role = roles[index % roles.length] ?? 'planner';
    return agent({
      id: `agent://mcplab-${index}`,
      name: `MCPLab ${role} ${index}`,
      fleet: 'mcplab',
      role,
      status: index < 2 ? 'active' : 'idle',
    });
  });

  const startupAgents = Array.from({ length: 3 }, (_, index) =>
    agent({
      id: `agent://startup-${index}`,
      name: `Startup Agent ${index}`,
      fleet: 'startup-demo',
      role: 'coder',
    }),
  );

  const traceAgents = [
    agent({
      id: 'agent://coordinator',
      name: 'Coordinator',
      fleet: 'mcplab',
      role: 'coordinator',
      status: 'active',
    }),
    agent({
      id: 'agent://worker',
      name: 'Worker',
      fleet: 'mcplab',
      role: 'coder',
      status: 'active',
    }),
  ];

  const idlePlanner = agent({
    id: 'agent://idle-planner',
    name: 'Idle Planner',
    fleet: 'mcplab',
    role: 'planner',
  });

  const agents = [...traceAgents, idlePlanner, ...mcplabAgents, ...startupAgents];
  const activeAgentIds = new Set(['agent://coordinator', 'agent://worker']);

  const timeline: TraceTimelineEvent[] = [
    {
      index: 0,
      timestamp: '2026-06-20T00:00:00.000Z',
      type: 'task_request',
      from: 'agent://coordinator',
      to: 'agent://worker',
      message_id: 'm1',
      summary: 'delegate',
    },
    {
      index: 1,
      timestamp: '2026-06-20T00:00:01.000Z',
      type: 'task_response',
      from: 'agent://worker',
      to: 'agent://coordinator',
      message_id: 'm2',
      summary: 'done',
    },
  ];

  return { agents, activeAgentIds, timeline };
}

function runPipeline(options: {
  readonly agents: readonly AgentObservabilityRecord[];
  readonly activeAgentIds: ReadonlySet<string>;
  readonly traceSelected: boolean;
  readonly showAllRegistered: boolean;
  readonly catalogFilters?: AgentCatalogFilters;
  readonly searchQuery?: string;
  readonly pinnedAgentIds?: readonly string[];
  readonly timeline?: readonly TraceTimelineEvent[];
}) {
  const scope = resolveAgentTraceScope({
    agents: options.agents,
    activeAgentIds: options.activeAgentIds,
    traceSelected: options.traceSelected,
    showAllRegistered: options.showAllRegistered,
  });

  return buildAgentCatalogView({
    agents: options.agents,
    scopedAgents: scope.scopedAgents,
    activeAgentIds: options.activeAgentIds,
    catalogFilters: options.catalogFilters ?? DEFAULT_AGENT_CATALOG_FILTERS,
    searchQuery: options.searchQuery ?? '',
    pinnedAgentIds: options.pinnedAgentIds,
    traceTimeline: options.timeline,
  });
}

describe('buildAgentCatalogView', () => {
  const demo = buildMcplabDemoCatalog();

  it('defaults to trace-scoped agents at MCPLab demo scale (27+ registry)', () => {
    expect(demo.agents.length).toBeGreaterThanOrEqual(27);

    const view = runPipeline({
      agents: demo.agents,
      activeAgentIds: demo.activeAgentIds,
      traceSelected: true,
      showAllRegistered: false,
    });

    expect(view.filteredAgents.map((row) => row.id)).toEqual([
      'agent://coordinator',
      'agent://worker',
    ]);
    expect(view.fleetGroups).toHaveLength(1);
    expect(view.fleetGroups[0]?.fleetId).toBe('mcplab');
  });

  it('groups fleets when show-all is enabled', () => {
    const view = runPipeline({
      agents: demo.agents,
      activeAgentIds: demo.activeAgentIds,
      traceSelected: true,
      showAllRegistered: true,
    });

    const fleetIds = view.fleetGroups.map((group) => group.fleetId);
    expect(fleetIds).toContain('mcplab');
    expect(fleetIds).toContain('startup-demo');
    expect(fleetIds.indexOf('mcplab')).toBeLessThan(fleetIds.indexOf('startup-demo'));
  });

  it('composes fleet filter and search to a single planner', () => {
    const view = runPipeline({
      agents: demo.agents,
      activeAgentIds: demo.activeAgentIds,
      traceSelected: true,
      showAllRegistered: true,
      catalogFilters: { ...DEFAULT_AGENT_CATALOG_FILTERS, fleet: 'mcplab' },
      searchQuery: 'idle planner',
    });

    expect(view.filteredAgents.map((row) => row.id)).toEqual(['agent://idle-planner']);
    expect(view.activeFilters).toBe(true);
    expect(view.activeSearch).toBe(true);
  });

  it('sorts by trace activity when requested', () => {
    const view = runPipeline({
      agents: demo.agents,
      activeAgentIds: demo.activeAgentIds,
      traceSelected: true,
      showAllRegistered: false,
      catalogFilters: { ...DEFAULT_AGENT_CATALOG_FILTERS, sort: 'activity' },
      timeline: demo.timeline,
    });

    expect(view.filteredAgents.map((row) => row.id)).toEqual([
      'agent://coordinator',
      'agent://worker',
    ]);
  });

  it('pins agents above fleet groups without duplicating rows', () => {
    const view = runPipeline({
      agents: demo.agents,
      activeAgentIds: demo.activeAgentIds,
      traceSelected: true,
      showAllRegistered: true,
      pinnedAgentIds: ['agent://idle-planner'],
    });

    expect(view.pinnedAgents.map((row) => row.id)).toEqual(['agent://idle-planner']);
    expect(view.unpinnedAgents.some((row) => row.id === 'agent://idle-planner')).toBe(false);
    expect(
      view.fleetGroups
        .flatMap((group) => group.agents)
        .some((row) => row.id === 'agent://idle-planner'),
    ).toBe(false);
  });

  it('preserves catalog sort order inside fleet groups', () => {
    const view = runPipeline({
      agents: demo.agents,
      activeAgentIds: demo.activeAgentIds,
      traceSelected: true,
      showAllRegistered: true,
      catalogFilters: { ...DEFAULT_AGENT_CATALOG_FILTERS, fleet: 'startup-demo' },
    });

    const startupGroup = view.fleetGroups.find((group) => group.fleetId === 'startup-demo');
    expect(startupGroup?.agents.map((row) => row.id)).toEqual([
      'agent://startup-0',
      'agent://startup-1',
      'agent://startup-2',
    ]);
  });
});
