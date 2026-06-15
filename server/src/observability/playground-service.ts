import {
  PROTOCOL_VERSION,
  type AgentIdentity,
  type TraceBundle,
  type TraceListEntry,
} from '@oacp/core';

import type { AgentRegistry } from '../registry/agent-registry.js';
import { listActiveTraces, resolveTraceBundle, type TraceServiceContext } from './trace-service.js';

/** Agent-to-agent link aggregated from a delegation graph (for playground rendering). */
export interface PlaygroundAgentLink {
  readonly from_agent: string;
  readonly to_agent: string;
  readonly kind: string;
  readonly capability?: string;
  readonly message_count: number;
}

/** Unified playground poll payload — one round trip for live UI refresh. */
export interface PlaygroundSnapshot {
  readonly server: {
    readonly status: 'healthy';
    readonly protocol_version: string;
    readonly registered_agents: number;
    readonly bus_open: boolean;
  };
  readonly agents: readonly AgentIdentity[];
  readonly traces: readonly TraceListEntry[];
  readonly trace_count: number;
  readonly active_trace?: TraceBundle;
  readonly agent_links: readonly PlaygroundAgentLink[];
}

export interface PlaygroundServiceContext extends TraceServiceContext {
  readonly registry: AgentRegistry;
}

export interface BuildPlaygroundSnapshotOptions {
  readonly traceId?: string;
  readonly traceLimit?: number;
}

function aggregateAgentLinks(trace: TraceBundle | undefined): readonly PlaygroundAgentLink[] {
  const graph = trace?.graph;
  if (!graph || graph.edges.length === 0) {
    return [];
  }

  const linkMap = new Map<string, PlaygroundAgentLink>();

  for (const edge of graph.edges) {
    const toAgent = edge.to_agent;
    if (!toAgent || edge.from_agent === toAgent) {
      continue;
    }

    const key = `${edge.from_agent}\0${toAgent}\0${edge.kind}\0${edge.capability ?? ''}`;
    const existing = linkMap.get(key);
    if (existing) {
      linkMap.set(key, {
        ...existing,
        message_count: existing.message_count + 1,
      });
      continue;
    }

    linkMap.set(key, {
      from_agent: edge.from_agent,
      to_agent: toAgent,
      kind: edge.kind,
      ...(edge.capability !== undefined ? { capability: edge.capability } : {}),
      message_count: 1,
    });
  }

  return [...linkMap.values()].sort((left, right) =>
    left.from_agent.localeCompare(right.from_agent),
  );
}

/** Build a unified snapshot for the playground UI (agents, traces, optional active trace). */
export async function buildPlaygroundSnapshot(
  context: PlaygroundServiceContext,
  options: BuildPlaygroundSnapshotOptions = {},
): Promise<PlaygroundSnapshot> {
  const limit = options.traceLimit ?? 25;
  const traceListing = listActiveTraces(context, { limit, offset: 0 });
  const stats = context.bus.getStats();

  let activeTrace: TraceBundle | undefined;
  if (options.traceId !== undefined && options.traceId.length > 0) {
    activeTrace = await resolveTraceBundle(context, options.traceId);
  }

  return {
    server: {
      status: 'healthy',
      protocol_version: PROTOCOL_VERSION,
      registered_agents: context.registry.size,
      bus_open: stats.isOpen,
    },
    agents: context.registry.list(),
    traces: traceListing.traces,
    trace_count: traceListing.total,
    ...(activeTrace !== undefined ? { active_trace: activeTrace } : {}),
    agent_links: aggregateAgentLinks(activeTrace),
  };
}
