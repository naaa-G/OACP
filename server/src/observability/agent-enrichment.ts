import type { AgentIdentity, TraceBundle, TraceListEntry } from '@oacp/core';
import { resolveAgentObservabilityTaxonomy } from '@oacp/core';

/** Runtime observability fields appended to registry agents in snapshot responses. */
export type AgentObservabilityStatus = 'idle' | 'active' | 'error' | 'offline';

export interface AgentObservabilityRecord extends AgentIdentity {
  readonly fleet?: string;
  readonly role?: string;
  readonly status: AgentObservabilityStatus;
  readonly last_seen_at?: string;
}

export interface EnrichAgentsForSnapshotInput {
  readonly agents: readonly AgentIdentity[];
  readonly traces: readonly TraceListEntry[];
  readonly activeTrace?: TraceBundle | undefined;
  readonly activeAgentIds: ReadonlySet<string>;
  readonly persistedLastSeen?: ReadonlyMap<string, string> | undefined;
}

/** Read a trimmed string from agent metadata (fleet, role, etc.). */
export function readMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (metadata === undefined) {
    return undefined;
  }

  const value = metadata[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseAgentFleet(metadata: Record<string, unknown> | undefined): string | undefined {
  return readMetadataString(metadata, 'fleet');
}

export function parseAgentRole(metadata: Record<string, unknown> | undefined): string | undefined {
  return readMetadataString(metadata, 'role');
}

/** Agent IDs participating in a trace — roster plus timeline senders/recipients. */
export function activeAgentIdsFromTrace(trace: TraceBundle | undefined): ReadonlySet<string> {
  const active = new Set<string>();
  if (trace === undefined) {
    return active;
  }

  for (const agentId of trace.agents) {
    active.add(agentId);
  }

  for (const event of trace.timeline) {
    if (event.from.length > 0) {
      active.add(event.from);
    }
    if (event.to !== undefined && event.to.length > 0) {
      active.add(event.to);
    }
  }

  return active;
}

function buildLastSeenFromTraceListing(
  traces: readonly TraceListEntry[],
): ReadonlyMap<string, string> {
  const lastSeen = new Map<string, string>();

  for (const trace of traces) {
    for (const agentId of trace.agents) {
      const existing = lastSeen.get(agentId);
      if (existing === undefined || trace.lastActivityAt > existing) {
        lastSeen.set(agentId, trace.lastActivityAt);
      }
    }
  }

  return lastSeen;
}

function refineLastSeenFromActiveTrace(
  lastSeen: Map<string, string>,
  trace: TraceBundle | undefined,
): void {
  if (trace === undefined) {
    return;
  }

  for (const event of trace.timeline) {
    for (const agentId of [event.from, event.to]) {
      if (agentId === undefined || agentId.length === 0) {
        continue;
      }

      const existing = lastSeen.get(agentId);
      if (existing === undefined || event.timestamp > existing) {
        lastSeen.set(agentId, event.timestamp);
      }
    }
  }
}

function deriveAgentStatus(
  agentId: string,
  activeAgentIds: ReadonlySet<string>,
  activeTrace: TraceBundle | undefined,
): AgentObservabilityStatus {
  if (!activeAgentIds.has(agentId)) {
    return 'idle';
  }

  if (activeTrace !== undefined) {
    for (const event of activeTrace.timeline) {
      if (event.from === agentId && event.status === 'error') {
        return 'error';
      }
    }
  }

  return 'active';
}

/** Enrich registry agents with fleet, role, status, and last_seen_at for Console snapshots. */
export function enrichAgentsForSnapshot(
  input: EnrichAgentsForSnapshotInput,
): readonly AgentObservabilityRecord[] {
  const lastSeen = new Map(buildLastSeenFromTraceListing(input.traces));
  refineLastSeenFromActiveTrace(lastSeen, input.activeTrace);

  if (input.persistedLastSeen !== undefined) {
    for (const [agentId, seenAt] of input.persistedLastSeen) {
      const existing = lastSeen.get(agentId);
      if (existing === undefined || seenAt > existing) {
        lastSeen.set(agentId, seenAt);
      }
    }
  }

  return input.agents.map((agent) => {
    const taxonomy = resolveAgentObservabilityTaxonomy(agent);
    const status = deriveAgentStatus(agent.id, input.activeAgentIds, input.activeTrace);
    const seenAt = lastSeen.get(agent.id);

    return {
      ...agent,
      status,
      ...(taxonomy.fleet !== undefined ? { fleet: taxonomy.fleet } : {}),
      ...(taxonomy.role !== undefined ? { role: taxonomy.role } : {}),
      ...(seenAt !== undefined ? { last_seen_at: seenAt } : {}),
    };
  });
}
