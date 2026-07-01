import type {
  AgentLink,
  AgentObservabilityRecord,
  TraceGraphView,
} from '@oacp/observability-client';

import { computeOpsGraphAgentDepths } from '../graph/ops-graph-depth.js';

export interface BuildTraceGraphFromSnapshotInput {
  readonly traceId: string;
  readonly agents: readonly AgentObservabilityRecord[];
  readonly agentLinks: readonly AgentLink[];
  readonly participantIds: ReadonlySet<string>;
}

function shortAgentLabel(agentId: string): string {
  return agentId.replace(/^agent:\/\//, '');
}

/** Build an Ops graph view from snapshot roster + links when the graph API is slow or unavailable. */
export function buildTraceGraphFromSnapshot(
  input: BuildTraceGraphFromSnapshotInput,
): TraceGraphView | undefined {
  const { traceId, agents, agentLinks, participantIds } = input;

  const agentIds =
    participantIds.size > 0
      ? [...participantIds]
      : [...new Set(agentLinks.flatMap((link) => [link.from_agent, link.to_agent]))];

  if (agentIds.length === 0) {
    return undefined;
  }

  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const edges = agentLinks.map((link) => ({
    from_agent: link.from_agent,
    to_agent: link.to_agent,
    kind: link.kind,
    ...(link.capability !== undefined ? { capability: link.capability } : {}),
    message_count: link.message_count,
  }));

  const depths = computeOpsGraphAgentDepths(agentIds, edges);
  const nodes = agentIds
    .map((agentId) => {
      const agent = agentById.get(agentId);
      return {
        agent_id: agentId,
        name:
          agent !== undefined && agent.name.trim().length > 0
            ? agent.name
            : shortAgentLabel(agentId),
        depth: depths.get(agentId) ?? 0,
        ...(agent?.fleet !== undefined ? { fleet: agent.fleet } : {}),
        ...(agent?.role !== undefined ? { role: agent.role } : {}),
        status: agent?.status ?? ('active' as const),
        capabilities: agent?.capabilities ?? [],
      };
    })
    .sort((left, right) => {
      if (left.depth !== right.depth) {
        return left.depth - right.depth;
      }
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });

  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);

  return {
    trace_id: traceId,
    layout: 'hierarchical',
    max_depth: maxDepth,
    nodes,
    edges,
  };
}
