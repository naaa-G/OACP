import { useCallback, useSyncExternalStore } from 'react';

import {
  canPinAnotherAgent,
  MAX_PINNED_AGENTS,
  normalizePinnedAgentIds,
  PINNED_AGENTS_STORAGE_KEY,
} from '../utils/pinned-agents.js';

let pinnedAgentIds: readonly string[] = readStoredPinnedAgents();
const listeners = new Set<() => void>();

function readStoredPinnedAgents(): readonly string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PINNED_AGENTS_STORAGE_KEY);
    if (raw === null) {
      return [];
    }

    return normalizePinnedAgentIds(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeStoredPinnedAgents(ids: readonly string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PINNED_AGENTS_STORAGE_KEY, JSON.stringify(ids));
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

function getSnapshot(): readonly string[] {
  return pinnedAgentIds;
}

export function usePinnedAgents(): {
  readonly pinnedAgentIds: readonly string[];
  readonly isPinned: (agentId: string) => boolean;
  readonly canPin: (agentId: string) => boolean;
  readonly togglePin: (agentId: string) => boolean;
  readonly unpinAgent: (agentId: string) => void;
} {
  const ids = useSyncExternalStore(subscribe, getSnapshot, () => []);

  const isPinned = useCallback((agentId: string) => ids.includes(agentId), [ids]);

  const canPin = useCallback((agentId: string) => canPinAnotherAgent(ids, agentId), [ids]);

  const togglePin = useCallback(
    (agentId: string): boolean => {
      if (ids.includes(agentId)) {
        pinnedAgentIds = ids.filter((id) => id !== agentId);
        writeStoredPinnedAgents(pinnedAgentIds);
        emitChange();
        return true;
      }

      if (!canPinAnotherAgent(ids, agentId)) {
        return false;
      }

      pinnedAgentIds = [...ids, agentId];
      writeStoredPinnedAgents(pinnedAgentIds);
      emitChange();
      return true;
    },
    [ids],
  );

  const unpinAgent = useCallback(
    (agentId: string) => {
      if (!ids.includes(agentId)) {
        return;
      }

      pinnedAgentIds = ids.filter((id) => id !== agentId);
      writeStoredPinnedAgents(pinnedAgentIds);
      emitChange();
    },
    [ids],
  );

  return {
    pinnedAgentIds: ids,
    isPinned,
    canPin,
    togglePin,
    unpinAgent,
  };
}

export function resetPinnedAgentsForTests(): void {
  pinnedAgentIds = [];
  writeStoredPinnedAgents(pinnedAgentIds);
  emitChange();
}

export { MAX_PINNED_AGENTS };
