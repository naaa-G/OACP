import type { AgentObservabilityRecord, TraceTimelineEvent } from '@oacp/observability-client';

import { CATALOG_FLEET_ORDER, resolveFleetBucket, type CatalogFleetId } from './fleet-catalog.js';

export type AgentCatalogStatusFilter = 'idle' | 'active' | 'error';

export type AgentCatalogSort = 'name' | 'last_seen' | 'activity';

export interface AgentCatalogFilters {
  readonly statuses: readonly AgentCatalogStatusFilter[];
  readonly fleet: CatalogFleetId | null;
  readonly inTraceOnly: boolean;
  readonly sort: AgentCatalogSort;
}

export const DEFAULT_AGENT_CATALOG_FILTERS: AgentCatalogFilters = {
  statuses: [],
  fleet: null,
  inTraceOnly: false,
  sort: 'name',
};

export function hasActiveCatalogFilters(filters: AgentCatalogFilters): boolean {
  return (
    filters.statuses.length > 0 ||
    filters.fleet !== null ||
    filters.inTraceOnly ||
    filters.sort !== 'name'
  );
}

export function resolveAgentCatalogStatus(
  agent: AgentObservabilityRecord,
  activeAgentIds: ReadonlySet<string>,
): AgentCatalogStatusFilter {
  if (agent.status === 'error') {
    return 'error';
  }

  if (activeAgentIds.has(agent.id) || agent.status === 'active') {
    return 'active';
  }

  return 'idle';
}

/** Count timeline events per agent (as sender or recipient). */
export function buildTraceActivityCounts(
  timeline: readonly TraceTimelineEvent[] | undefined,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const event of timeline ?? []) {
    counts.set(event.from, (counts.get(event.from) ?? 0) + 1);
    if (event.to !== undefined) {
      counts.set(event.to, (counts.get(event.to) ?? 0) + 1);
    }
  }

  return counts;
}

export function agentMatchesCatalogFilters(
  agent: AgentObservabilityRecord,
  filters: AgentCatalogFilters,
  activeAgentIds: ReadonlySet<string>,
): boolean {
  if (filters.inTraceOnly && !activeAgentIds.has(agent.id)) {
    return false;
  }

  if (filters.fleet !== null && resolveFleetBucket(agent.fleet) !== filters.fleet) {
    return false;
  }

  if (filters.statuses.length > 0) {
    const status = resolveAgentCatalogStatus(agent, activeAgentIds);
    if (!filters.statuses.includes(status)) {
      return false;
    }
  }

  return true;
}

export function filterAgentsByCatalog(
  agents: readonly AgentObservabilityRecord[],
  filters: AgentCatalogFilters,
  activeAgentIds: ReadonlySet<string>,
): AgentObservabilityRecord[] {
  return agents.filter((agent) => agentMatchesCatalogFilters(agent, filters, activeAgentIds));
}

function compareByName(left: AgentObservabilityRecord, right: AgentObservabilityRecord): number {
  const leftName = left.name.trim().length > 0 ? left.name : left.id;
  const rightName = right.name.trim().length > 0 ? right.name : right.id;
  return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' });
}

export function sortAgentsForCatalog(
  agents: readonly AgentObservabilityRecord[],
  sort: AgentCatalogSort,
  activityCounts: ReadonlyMap<string, number>,
): AgentObservabilityRecord[] {
  const sorted = [...agents];

  sorted.sort((left, right) => {
    if (sort === 'last_seen') {
      const leftSeen = Date.parse(left.last_seen_at ?? '') || 0;
      const rightSeen = Date.parse(right.last_seen_at ?? '') || 0;
      if (rightSeen !== leftSeen) {
        return rightSeen - leftSeen;
      }
      return compareByName(left, right);
    }

    if (sort === 'activity') {
      const leftActivity = activityCounts.get(left.id) ?? 0;
      const rightActivity = activityCounts.get(right.id) ?? 0;
      if (rightActivity !== leftActivity) {
        return rightActivity - leftActivity;
      }
      return compareByName(left, right);
    }

    return compareByName(left, right);
  });

  return sorted;
}

export function listAvailableFleetFilters(
  agents: readonly AgentObservabilityRecord[],
): readonly CatalogFleetId[] {
  const present = new Set<CatalogFleetId>();
  for (const agent of agents) {
    present.add(resolveFleetBucket(agent.fleet));
  }

  return CATALOG_FLEET_ORDER.filter((fleetId) => present.has(fleetId));
}
