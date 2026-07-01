import type { AgentObservabilityRecord, TraceTimelineEvent } from '@oacp/observability-client';

import type { AgentCatalogFilters } from './agent-catalog-filter.js';
import {
  buildTraceActivityCounts,
  filterAgentsByCatalog,
  hasActiveCatalogFilters,
  sortAgentsForCatalog,
} from './agent-catalog-filter.js';
import { hasActiveSearchQuery, searchAgents, type AgentSearchHighlights } from './agent-search.js';
import { groupAgentsByFleet, type FleetAgentGroup } from './fleet-catalog.js';
import { splitPinnedAgents } from './pinned-agents.js';

export interface AgentCatalogPipelineInput {
  readonly agents: readonly AgentObservabilityRecord[];
  readonly scopedAgents: readonly AgentObservabilityRecord[];
  readonly activeAgentIds: ReadonlySet<string>;
  readonly catalogFilters: AgentCatalogFilters;
  readonly searchQuery: string;
  readonly pinnedAgentIds?: readonly string[] | undefined;
  readonly traceTimeline?: readonly TraceTimelineEvent[] | undefined;
}

export interface AgentCatalogPipelineResult {
  readonly filteredAgents: readonly AgentObservabilityRecord[];
  readonly registryCatalogAgents: readonly AgentObservabilityRecord[];
  readonly pinnedAgents: readonly AgentObservabilityRecord[];
  readonly unpinnedAgents: readonly AgentObservabilityRecord[];
  readonly fleetGroups: readonly FleetAgentGroup[];
  readonly searchHighlightsByAgentId: ReadonlyMap<string, AgentSearchHighlights>;
  readonly activeSearch: boolean;
  readonly activeFilters: boolean;
}

/**
 * Pure catalog pipeline used by AgentsPanel (Day 25).
 * Order: trace scope (caller) → catalog filters → search → sort → pins → fleet groups.
 */
export function buildAgentCatalogView(
  input: AgentCatalogPipelineInput,
): AgentCatalogPipelineResult {
  const pinnedAgentIds = input.pinnedAgentIds ?? [];
  const activityCounts = buildTraceActivityCounts(input.traceTimeline);

  const catalogFilteredAgents = filterAgentsByCatalog(
    input.scopedAgents,
    input.catalogFilters,
    input.activeAgentIds,
  );

  const searchResults = searchAgents(catalogFilteredAgents, input.searchQuery);
  const filteredAgents = sortAgentsForCatalog(
    searchResults.map((result) => result.agent),
    input.catalogFilters.sort,
    activityCounts,
  );

  const registryFiltered = filterAgentsByCatalog(
    input.agents,
    input.catalogFilters,
    input.activeAgentIds,
  );
  const registrySearchResults = searchAgents(registryFiltered, input.searchQuery);
  const registryCatalogAgents = sortAgentsForCatalog(
    registrySearchResults.map((result) => result.agent),
    input.catalogFilters.sort,
    activityCounts,
  );

  const { pinnedAgents: pinned } = splitPinnedAgents(registryCatalogAgents, pinnedAgentIds);
  const pinnedSet = new Set(pinnedAgentIds);
  const unpinnedAgents = filteredAgents.filter((agent) => !pinnedSet.has(agent.id));

  const fleetGroups = groupAgentsByFleet(unpinnedAgents, input.activeAgentIds, {
    preserveOrder: true,
  });

  return {
    filteredAgents,
    registryCatalogAgents,
    pinnedAgents: pinned,
    unpinnedAgents,
    fleetGroups,
    searchHighlightsByAgentId: new Map(
      searchResults.map((result) => [result.agent.id, result.highlights]),
    ),
    activeSearch: hasActiveSearchQuery(input.searchQuery),
    activeFilters: hasActiveCatalogFilters(input.catalogFilters),
  };
}
