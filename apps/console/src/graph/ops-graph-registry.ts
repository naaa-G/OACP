import type {
  AgentObservabilityRecord,
  TraceGraphNode,
  TraceGraphView,
} from '@oacp/observability-client';
import { shortAgentId } from '@oacp/observability-client';

const REGISTRY_GHOST_DEPTH = 99;

export interface OpsGraphRegistryMergeResult {
  readonly graph: TraceGraphView;
  readonly ghostAgentIds: ReadonlySet<string>;
  readonly ghostCount: number;
}

/** Trace-scoped graph node ids (participants from the trace graph API). */
export function traceGraphParticipantIds(graph: TraceGraphView): ReadonlySet<string> {
  return new Set(graph.nodes.map((node) => node.agent_id));
}

/** Registry agents not present in the trace graph — shown as orbital ghost nodes (Day 34). */
export function listRegistryGhostAgents(
  graph: TraceGraphView,
  agents: readonly AgentObservabilityRecord[],
): readonly AgentObservabilityRecord[] {
  const participantIds = traceGraphParticipantIds(graph);
  return agents.filter((agent) => !participantIds.has(agent.id));
}

export function countRegistryGhostAgents(
  graph: TraceGraphView,
  agents: readonly AgentObservabilityRecord[],
): number {
  return listRegistryGhostAgents(graph, agents).length;
}

function buildGhostGraphNode(agent: AgentObservabilityRecord): TraceGraphNode {
  return {
    agent_id: agent.id,
    name: agent.name.trim().length > 0 ? agent.name : shortAgentId(agent.id),
    depth: REGISTRY_GHOST_DEPTH,
    ...(agent.fleet !== undefined ? { fleet: agent.fleet } : {}),
    ...(agent.role !== undefined ? { role: agent.role } : {}),
    status: 'idle',
    capabilities: agent.capabilities,
  };
}

/** Append registry-only agents as ghost nodes; trace hierarchy + edges unchanged. */
export function mergeRegistryGhostsIntoGraph(
  traceGraph: TraceGraphView,
  agents: readonly AgentObservabilityRecord[],
): OpsGraphRegistryMergeResult {
  const ghostAgents = listRegistryGhostAgents(traceGraph, agents);
  if (ghostAgents.length === 0) {
    return {
      graph: traceGraph,
      ghostAgentIds: new Set<string>(),
      ghostCount: 0,
    };
  }

  const ghostAgentIds = new Set(ghostAgents.map((agent) => agent.id));
  const ghostNodes = ghostAgents.map(buildGhostGraphNode);

  return {
    graph: {
      ...traceGraph,
      nodes: [...traceGraph.nodes, ...ghostNodes],
    },
    ghostAgentIds,
    ghostCount: ghostAgents.length,
  };
}
