import { useCallback, useSyncExternalStore } from 'react';

import {
  DEFAULT_AGENT_CATALOG_FILTERS,
  type AgentCatalogFilters,
  type AgentCatalogSort,
  type AgentCatalogStatusFilter,
} from '../utils/agent-catalog-filter.js';
import type { CatalogFleetId } from '../utils/fleet-catalog.js';

const STORAGE_KEY = 'oacp.console.catalogFilters.v1';

let filterState: AgentCatalogFilters = readStoredFilters();
const listeners = new Set<() => void>();

function readStoredFilters(): AgentCatalogFilters {
  if (typeof window === 'undefined') {
    return DEFAULT_AGENT_CATALOG_FILTERS;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_AGENT_CATALOG_FILTERS;
    }

    const parsed = JSON.parse(raw) as Partial<AgentCatalogFilters>;
    return {
      ...DEFAULT_AGENT_CATALOG_FILTERS,
      ...parsed,
      statuses: Array.isArray(parsed.statuses) ? parsed.statuses : [],
    };
  } catch {
    return DEFAULT_AGENT_CATALOG_FILTERS;
  }
}

function writeStoredFilters(state: AgentCatalogFilters): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AgentCatalogFilters {
  return filterState;
}

function updateFilters(patch: Partial<AgentCatalogFilters>): void {
  filterState = { ...filterState, ...patch };
  writeStoredFilters(filterState);
  emitChange();
}

export function useAgentCatalogFilters(): {
  readonly filters: AgentCatalogFilters;
  readonly toggleStatus: (status: AgentCatalogStatusFilter) => void;
  readonly toggleFleet: (fleet: CatalogFleetId) => void;
  readonly toggleInTraceOnly: () => void;
  readonly setSort: (sort: AgentCatalogSort) => void;
  readonly clearFilters: () => void;
} {
  const filters = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_AGENT_CATALOG_FILTERS);

  const toggleStatus = useCallback(
    (status: AgentCatalogStatusFilter) => {
      const next = new Set(filters.statuses);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      updateFilters({ statuses: [...next] });
    },
    [filters.statuses],
  );

  const toggleFleet = useCallback(
    (fleet: CatalogFleetId) => {
      updateFilters({ fleet: filters.fleet === fleet ? null : fleet });
    },
    [filters.fleet],
  );

  const toggleInTraceOnly = useCallback(() => {
    updateFilters({ inTraceOnly: !filters.inTraceOnly });
  }, [filters.inTraceOnly]);

  const setSort = useCallback((sort: AgentCatalogSort) => {
    updateFilters({ sort });
  }, []);

  const clearFilters = useCallback(() => {
    filterState = DEFAULT_AGENT_CATALOG_FILTERS;
    writeStoredFilters(filterState);
    emitChange();
  }, []);

  return {
    filters,
    toggleStatus,
    toggleFleet,
    toggleInTraceOnly,
    setSort,
    clearFilters,
  };
}

export function resetAgentCatalogFiltersForTests(): void {
  filterState = DEFAULT_AGENT_CATALOG_FILTERS;
  writeStoredFilters(filterState);
  emitChange();
}
