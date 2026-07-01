import { useCallback, useSyncExternalStore } from 'react';

import type { CatalogFleetId } from '../utils/fleet-catalog.js';
import { CATALOG_FLEET_ORDER } from '../utils/fleet-catalog.js';

const STORAGE_KEY = 'oacp.console.fleetCollapse.v1';

type FleetCollapseState = Readonly<Record<string, boolean>>;

const DEFAULT_STATE: FleetCollapseState = {
  mcplab: false,
  'startup-demo': false,
  system: false,
  external: false,
};

let collapseState: FleetCollapseState = readStoredState();
const listeners = new Set<() => void>();

function readStoredState(): FleetCollapseState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<Record<string, boolean>>;
    const merged: Record<string, boolean> = { ...DEFAULT_STATE };
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'boolean') {
        merged[key] = value;
      }
    }
    return merged;
  } catch {
    return DEFAULT_STATE;
  }
}

function writeStoredState(state: FleetCollapseState): void {
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

function getSnapshot(): FleetCollapseState {
  return collapseState;
}

function setFleetCollapsed(fleetId: CatalogFleetId, collapsed: boolean): void {
  collapseState = { ...collapseState, [fleetId]: collapsed };
  writeStoredState(collapseState);
  emitChange();
}

function toggleFleetCollapsed(fleetId: CatalogFleetId): void {
  setFleetCollapsed(fleetId, !(collapseState[fleetId] ?? false));
}

export function useFleetCollapse(): {
  readonly isFleetCollapsed: (fleetId: CatalogFleetId) => boolean;
  readonly toggleFleetCollapsed: (fleetId: CatalogFleetId) => void;
  readonly expandAllFleets: () => void;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE);

  const isFleetCollapsed = useCallback(
    (fleetId: CatalogFleetId) => state[fleetId] ?? false,
    [state],
  );

  const expandAllFleets = useCallback(() => {
    collapseState = DEFAULT_STATE;
    writeStoredState(collapseState);
    emitChange();
  }, []);

  return {
    isFleetCollapsed,
    toggleFleetCollapsed,
    expandAllFleets,
  };
}

export function resetFleetCollapseForTests(): void {
  collapseState = DEFAULT_STATE;
  writeStoredState(collapseState);
  emitChange();
}

export { CATALOG_FLEET_ORDER };
