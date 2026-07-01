import { useCallback, useSyncExternalStore } from 'react';

export type AgentCatalogDensity = 'compact' | 'detailed';

const STORAGE_KEY = 'oacp.console.agentDensity.v1';
const DEFAULT_DENSITY: AgentCatalogDensity = 'detailed';

let densityState: AgentCatalogDensity = readStoredDensity();
const listeners = new Set<() => void>();

function readStoredDensity(): AgentCatalogDensity {
  if (typeof window === 'undefined') {
    return DEFAULT_DENSITY;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === 'compact' || raw === 'detailed') {
      return raw;
    }
  } catch {
    // Ignore storage failures.
  }

  return DEFAULT_DENSITY;
}

function writeStoredDensity(density: AgentCatalogDensity): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, density);
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

function getSnapshot(): AgentCatalogDensity {
  return densityState;
}

export function useAgentCatalogDensity(): {
  readonly density: AgentCatalogDensity;
  readonly setDensity: (density: AgentCatalogDensity) => void;
  readonly toggleDensity: () => void;
} {
  const density = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_DENSITY);

  const setDensity = useCallback((next: AgentCatalogDensity) => {
    densityState = next;
    writeStoredDensity(next);
    emitChange();
  }, []);

  const toggleDensity = useCallback(() => {
    const next: AgentCatalogDensity = density === 'compact' ? 'detailed' : 'compact';
    densityState = next;
    writeStoredDensity(next);
    emitChange();
  }, [density]);

  return { density, setDensity, toggleDensity };
}

export function resetAgentCatalogDensityForTests(): void {
  densityState = DEFAULT_DENSITY;
  writeStoredDensity(densityState);
  emitChange();
}
