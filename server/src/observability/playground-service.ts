import { PROTOCOL_VERSION, type TraceBundle, type TraceListEntry } from '@oacp/core';

import type { AgentRegistry } from '../registry/agent-registry.js';
import type { ObservabilityPersistence } from './observability-persistence.js';
import { aggregateAgentLinksFromGraph } from './agent-link-aggregator.js';
import {
  activeAgentIdsFromTrace,
  enrichAgentsForSnapshot,
  type AgentObservabilityRecord,
} from './agent-enrichment.js';
import { listActiveTraces, resolveTraceBundle, type TraceServiceContext } from './trace-service.js';

/** Agent-to-agent link aggregated from a delegation graph (for playground rendering). */
export interface PlaygroundAgentLink {
  readonly from_agent: string;
  readonly to_agent: string;
  readonly kind: string;
  readonly capability?: string;
  readonly message_count: number;
}

/** Unified observability poll payload — one round trip for Console live refresh. */
export interface PlaygroundSnapshot {
  readonly server: {
    readonly status: 'healthy';
    readonly protocol_version: string;
    readonly registered_agents: number;
    readonly bus_open: boolean;
  };
  readonly agents: readonly AgentObservabilityRecord[];
  readonly traces: readonly TraceListEntry[];
  readonly trace_count: number;
  readonly active_trace?: TraceBundle;
  readonly agent_links: readonly PlaygroundAgentLink[];
}

/** Canonical v1 snapshot API path. */
export const OBSERVABILITY_SNAPSHOT_PATH = '/v1/observability/snapshot' as const;

/**
 * Legacy playground snapshot path — backward compatible until Day 60.
 * @deprecated Prefer {@link OBSERVABILITY_SNAPSHOT_PATH}.
 */
export const LEGACY_PLAYGROUND_SNAPSHOT_PATH = '/playground/snapshot' as const;

/** v1 alias — same shape as {@link PlaygroundSnapshot}. */
export type ObservabilitySnapshot = PlaygroundSnapshot;

export interface BuildPlaygroundSnapshotOptions {
  readonly traceId?: string;
  readonly traceLimit?: number;
}

/** v1 alias for {@link BuildPlaygroundSnapshotOptions}. */
export type BuildObservabilitySnapshotOptions = BuildPlaygroundSnapshotOptions;

function aggregateAgentLinks(trace: TraceBundle | undefined): readonly PlaygroundAgentLink[] {
  return aggregateAgentLinksFromGraph(trace?.graph);
}

export interface PlaygroundServiceContext extends TraceServiceContext {
  readonly registry: AgentRegistry;
}

function buildPersistedLastSeen(persistence: ObservabilityPersistence): Map<string, string> {
  const lastSeen = new Map<string, string>();
  if (!persistence.enabled) {
    return lastSeen;
  }

  for (const agent of persistence.listAgents()) {
    const seenAt = persistence.getAgentLastSeen(agent.id);
    if (seenAt !== undefined) {
      lastSeen.set(agent.id, seenAt);
    }
  }

  return lastSeen;
}

/** Build unified observability snapshot (agents, traces, optional active trace). */
export async function buildObservabilitySnapshot(
  context: PlaygroundServiceContext,
  options: BuildObservabilitySnapshotOptions = {},
): Promise<ObservabilitySnapshot> {
  const limit = options.traceLimit ?? 25;
  const traceListing = listActiveTraces(context, { limit, offset: 0 });
  const stats = context.bus.getStats();

  let activeTrace: TraceBundle | undefined;
  if (options.traceId !== undefined && options.traceId.length > 0) {
    activeTrace = await resolveTraceBundle(context, options.traceId);
  }

  const activeAgentIds = activeAgentIdsFromTrace(activeTrace);
  const agents = enrichAgentsForSnapshot({
    agents: context.registry.list(),
    traces: traceListing.traces,
    activeTrace,
    activeAgentIds,
    persistedLastSeen: buildPersistedLastSeen(context.observabilityPersistence),
  });

  return {
    server: {
      status: 'healthy',
      protocol_version: PROTOCOL_VERSION,
      registered_agents: context.registry.size,
      bus_open: stats.isOpen,
    },
    agents,
    traces: traceListing.traces,
    trace_count: traceListing.total,
    ...(activeTrace !== undefined ? { active_trace: activeTrace } : {}),
    agent_links: aggregateAgentLinks(activeTrace),
  };
}

/** @deprecated Use {@link buildObservabilitySnapshot}. */
export const buildPlaygroundSnapshot = buildObservabilitySnapshot;

export type { AgentObservabilityRecord, AgentObservabilityStatus } from './agent-enrichment.js';
export {
  activeAgentIdsFromTrace,
  enrichAgentsForSnapshot,
  parseAgentFleet,
  parseAgentRole,
} from './agent-enrichment.js';
