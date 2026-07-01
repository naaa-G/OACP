import type { AgentIdentity, TraceBundle } from '@oacp/core';

import type { AgentRegistry } from '../registry/agent-registry.js';
import {
  activeAgentIdsFromTrace,
  enrichAgentsForSnapshot,
  type AgentObservabilityRecord,
  type AgentObservabilityStatus,
} from './agent-enrichment.js';
import {
  DELEGATION_EDGE_KINDS,
  resolveTraceAgentLinks,
  type PlaygroundAgentLink,
} from './agent-link-aggregator.js';
import { listActiveTraces, resolveTraceBundle, type TraceServiceContext } from './trace-service.js';

export type TraceGraphLayoutHint = 'hierarchical';

export interface TraceGraphNode {
  readonly agent_id: string;
  readonly name: string;
  readonly depth: number;
  readonly fleet?: string;
  readonly role?: string;
  readonly status: AgentObservabilityStatus;
  readonly capabilities: readonly string[];
}

export interface TraceGraphEdge {
  readonly from_agent: string;
  readonly to_agent: string;
  readonly kind: string;
  readonly capability?: string;
  readonly message_count: number;
}

/** Trace-scoped agent graph for Ops 2D layout (Day 26). */
export interface TraceGraphView {
  readonly trace_id: string;
  readonly layout: TraceGraphLayoutHint;
  readonly max_depth: number;
  readonly nodes: readonly TraceGraphNode[];
  readonly edges: readonly TraceGraphEdge[];
}

export interface TraceGraphServiceContext extends TraceServiceContext {
  readonly registry: AgentRegistry;
}

function shortAgentLabel(agentId: string): string {
  return agentId.replace(/^agent:\/\//, '');
}

function buildEnrichedAgentMap(
  context: TraceGraphServiceContext,
  trace: TraceBundle,
  activeAgentIds: ReadonlySet<string>,
): Map<string, AgentObservabilityRecord> {
  const traceListing = listActiveTraces(context, { limit: 25, offset: 0 });
  const registryById = new Map(context.registry.list().map((agent) => [agent.id, agent]));

  const traceAgents: AgentIdentity[] = [];
  for (const agentId of activeAgentIds) {
    const registered = registryById.get(agentId);
    if (registered !== undefined) {
      traceAgents.push(registered);
      continue;
    }

    traceAgents.push({
      id: agentId,
      name: shortAgentLabel(agentId),
      version: '0.0',
      capabilities: [],
      publicKey: 'unknown',
    });
  }

  const enriched = enrichAgentsForSnapshot({
    agents: traceAgents,
    traces: traceListing.traces,
    activeTrace: trace,
    activeAgentIds,
  });

  return new Map(enriched.map((agent) => [agent.id, agent]));
}

/** BFS depth along delegation/subtask agent edges (roots at depth 0). */
export function computeAgentDepths(
  agentIds: readonly string[],
  links: readonly PlaygroundAgentLink[],
): ReadonlyMap<string, number> {
  const depths = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();
  const incoming = new Set<string>();

  for (const agentId of agentIds) {
    depths.set(agentId, 0);
    adjacency.set(agentId, new Set());
  }

  for (const link of links) {
    if (!DELEGATION_EDGE_KINDS.has(link.kind)) {
      continue;
    }

    if (!adjacency.has(link.from_agent) || !adjacency.has(link.to_agent)) {
      continue;
    }

    adjacency.get(link.from_agent)?.add(link.to_agent);
    incoming.add(link.to_agent);
  }

  const roots = agentIds.filter((agentId) => !incoming.has(agentId));
  const queue = (roots.length > 0 ? roots : [...agentIds]).map((agentId) => ({
    agentId,
    depth: 0,
  }));

  const bestDepth = new Map<string, number>();
  for (const entry of queue) {
    bestDepth.set(entry.agentId, entry.depth);
    depths.set(entry.agentId, entry.depth);
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    if (current === undefined) {
      break;
    }
    head += 1;
    for (const nextAgentId of adjacency.get(current.agentId) ?? []) {
      const nextDepth = current.depth + 1;
      const existing = bestDepth.get(nextAgentId);
      if (existing !== undefined && nextDepth <= existing) {
        continue;
      }

      bestDepth.set(nextAgentId, nextDepth);
      depths.set(nextAgentId, nextDepth);
      queue.push({ agentId: nextAgentId, depth: nextDepth });
    }
  }

  return depths;
}

function buildTraceGraphNodes(
  trace: TraceBundle,
  enrichedById: ReadonlyMap<string, AgentObservabilityRecord>,
  depths: ReadonlyMap<string, number>,
): TraceGraphNode[] {
  const agentIds = [...activeAgentIdsFromTrace(trace)];

  return agentIds
    .map((agentId) => {
      const enriched = enrichedById.get(agentId);
      return {
        agent_id: agentId,
        name:
          enriched !== undefined && enriched.name.trim().length > 0
            ? enriched.name
            : shortAgentLabel(agentId),
        depth: depths.get(agentId) ?? 0,
        ...(enriched?.fleet !== undefined ? { fleet: enriched.fleet } : {}),
        ...(enriched?.role !== undefined ? { role: enriched.role } : {}),
        status: enriched?.status ?? 'active',
        capabilities: enriched?.capabilities ?? [],
      };
    })
    .sort((left, right) => {
      if (left.depth !== right.depth) {
        return left.depth - right.depth;
      }

      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });
}

/** Build trace-scoped agent graph (participants only — not full registry). */
export async function buildTraceGraphView(
  context: TraceGraphServiceContext,
  traceId: string,
): Promise<TraceGraphView | undefined> {
  const trace = await resolveTraceBundle(context, traceId);
  if (trace === undefined) {
    return undefined;
  }

  const activeAgentIds = activeAgentIdsFromTrace(trace);
  if (activeAgentIds.size === 0) {
    return undefined;
  }

  const links = resolveTraceAgentLinks(trace);
  const depths = computeAgentDepths([...activeAgentIds], links);
  const enrichedById = buildEnrichedAgentMap(context, trace, activeAgentIds);
  const nodes = buildTraceGraphNodes(trace, enrichedById, depths);
  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);

  return {
    trace_id: trace.trace_id,
    layout: 'hierarchical',
    max_depth: maxDepth,
    nodes,
    edges: links.map((link) => ({
      from_agent: link.from_agent,
      to_agent: link.to_agent,
      kind: link.kind,
      ...(link.capability !== undefined ? { capability: link.capability } : {}),
      message_count: link.message_count,
    })),
  };
}
