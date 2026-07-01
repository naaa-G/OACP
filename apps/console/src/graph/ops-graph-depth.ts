import type { TraceGraphEdge } from '@oacp/observability-client';

/** Edge kinds that participate in hierarchical depth assignment (Day 26 / Day 35). */
export const OPS_DELEGATION_EDGE_KINDS = new Set(['delegates', 'subtask']);

/** BFS depth along delegation/subtask edges (roots at depth 0). Mirrors server trace-graph.ts. */
export function computeOpsGraphAgentDepths(
  agentIds: readonly string[],
  edges: readonly Pick<TraceGraphEdge, 'from_agent' | 'to_agent' | 'kind'>[],
): ReadonlyMap<string, number> {
  const depths = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();
  const incoming = new Set<string>();

  for (const agentId of agentIds) {
    depths.set(agentId, 0);
    adjacency.set(agentId, new Set());
  }

  for (const edge of edges) {
    if (!OPS_DELEGATION_EDGE_KINDS.has(edge.kind)) {
      continue;
    }
    if (!adjacency.has(edge.from_agent) || !adjacency.has(edge.to_agent)) {
      continue;
    }
    adjacency.get(edge.from_agent)?.add(edge.to_agent);
    incoming.add(edge.to_agent);
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
      if (existing !== undefined && nextDepth >= existing) {
        continue;
      }

      bestDepth.set(nextAgentId, nextDepth);
      depths.set(nextAgentId, nextDepth);
      queue.push({ agentId: nextAgentId, depth: nextDepth });
    }
  }

  return depths;
}

/** Assign depth to trace graph nodes using delegation edges (for layout validation). */
export function assignTraceGraphNodeDepths<
  T extends { readonly agent_id: string; readonly depth: number },
>(nodes: readonly T[], edges: readonly TraceGraphEdge[]): T[] {
  const agentIds = nodes.map((node) => node.agent_id);
  const depths = computeOpsGraphAgentDepths(agentIds, edges);
  return nodes.map((node) => ({
    ...node,
    depth: depths.get(node.agent_id) ?? node.depth,
  }));
}
