import type { AgentObservabilityRecord } from '@oacp/observability-client';

export const MAX_PINNED_AGENTS = 5;

export const PINNED_AGENTS_STORAGE_KEY = 'oacp.console.pinnedAgents.v1';

export interface PinnedAgentSplit {
  readonly pinnedAgents: readonly AgentObservabilityRecord[];
  readonly unpinnedAgents: readonly AgentObservabilityRecord[];
}

/** Resolve pinned agents in stored order, then remaining catalog rows. */
export function splitPinnedAgents(
  agents: readonly AgentObservabilityRecord[],
  pinnedAgentIds: readonly string[],
): PinnedAgentSplit {
  if (pinnedAgentIds.length === 0) {
    return { pinnedAgents: [], unpinnedAgents: agents };
  }

  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const pinnedSet = new Set(pinnedAgentIds);

  const pinnedAgents = pinnedAgentIds
    .map((agentId) => byId.get(agentId))
    .filter((agent): agent is AgentObservabilityRecord => agent !== undefined);

  const unpinnedAgents = agents.filter((agent) => !pinnedSet.has(agent.id));

  return { pinnedAgents, unpinnedAgents };
}

export function canPinAnotherAgent(pinnedAgentIds: readonly string[], agentId: string): boolean {
  if (pinnedAgentIds.includes(agentId)) {
    return true;
  }

  return pinnedAgentIds.length < MAX_PINNED_AGENTS;
}

export function normalizePinnedAgentIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim().length === 0 || seen.has(entry)) {
      continue;
    }

    seen.add(entry);
    normalized.push(entry);
    if (normalized.length >= MAX_PINNED_AGENTS) {
      break;
    }
  }

  return normalized;
}
