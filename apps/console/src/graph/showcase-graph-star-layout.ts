import type { TraceGraphView } from '@oacp/observability-client';

import { resolveOpsEdgeKindStyle } from './ops-graph-edge.js';
import { isOpsGraphNodeActive } from './ops-graph-node-style.js';
import { showcaseFleetColor } from './showcase-fleet-colors.js';
import type {
  ShowcaseForceEdge,
  ShowcaseForceLayoutResult,
  ShowcaseForceNode,
} from './showcase-graph-force.js';
import { initialShowcaseForcePosition } from './showcase-graph-force.js';
import { showcaseFleetClusterOffset } from './showcase-fleet-bands.js';
import {
  countDistinctShowcaseFleets,
  groupNodesByFleetBucket,
} from './showcase-graph-fleet-cluster.js';
import {
  computeShowcaseNodeActivityScores,
  showcaseGraphDisplayRadius,
  showcaseGraphNodeRadius,
} from './showcase-graph-node-style.js';

function layoutFleetStarNodes(
  fleetNodes: readonly TraceGraphView['nodes'][number][],
  graph: TraceGraphView,
  activeAgentIds: ReadonlySet<string>,
  activityScores: ReadonlyMap<string, number>,
  maxActivity: number,
): ShowcaseForceNode[] {
  const outDegree = new Map<string, number>();
  for (const edge of graph.edges) {
    outDegree.set(edge.from_agent, (outDegree.get(edge.from_agent) ?? 0) + 1);
  }

  const sortedNodes = [...fleetNodes].sort((left, right) => {
    if (left.depth !== right.depth) {
      return left.depth - right.depth;
    }
    return (outDegree.get(right.agent_id) ?? 0) - (outDegree.get(left.agent_id) ?? 0);
  });

  const hub = sortedNodes[0];
  if (hub === undefined) {
    return [];
  }

  const workers = sortedNodes.filter((node) => node.agent_id !== hub.agent_id);
  const orbitRadius = Math.max(2.4, 1.8 + workers.length * 0.28);
  const [offsetX, offsetY, offsetZ] = showcaseFleetClusterOffset(hub.fleet);

  return sortedNodes.map((node) => {
    const isHub = node.agent_id === hub.agent_id;
    const isActive = isOpsGraphNodeActive(node.agent_id, activeAgentIds, node.status);
    const activityScore = activityScores.get(node.agent_id) ?? 0;
    const radius = showcaseGraphDisplayRadius(
      showcaseGraphNodeRadius(activityScore, maxActivity, isActive),
      graph.nodes.length,
    );

    let x = offsetX;
    let y = offsetY;
    let z = offsetZ;

    if (!isHub) {
      const workerIndex = workers.findIndex((worker) => worker.agent_id === node.agent_id);
      const [px, py, pz] = initialShowcaseForcePosition(workerIndex, workers.length, orbitRadius);
      x = offsetX + px;
      y = offsetY + py;
      z = offsetZ + pz;
    }

    return {
      agentId: node.agent_id,
      label: node.name.trim().length > 0 ? node.name : node.agent_id,
      ...(node.fleet !== undefined ? { fleet: node.fleet } : {}),
      ...(node.role !== undefined ? { role: node.role } : {}),
      color: showcaseFleetColor(node.fleet),
      radius,
      isActive,
      activityScore,
      x,
      y,
      z,
    };
  });
}

/** Deterministic hub-and-spoke layout for small traces (≤8 agents), fleet-clustered (Day 42). */
export function layoutShowcaseStarGraph(
  graph: TraceGraphView,
  activeAgentIds: ReadonlySet<string> = new Set<string>(),
): ShowcaseForceLayoutResult {
  const activityScores = computeShowcaseNodeActivityScores(
    graph.nodes,
    graph.edges,
    activeAgentIds,
  );
  const maxActivity = Math.max(1, ...activityScores.values());

  const nodes =
    countDistinctShowcaseFleets(graph.nodes) > 1
      ? [...groupNodesByFleetBucket(graph.nodes).values()].flatMap((fleetNodes) =>
          layoutFleetStarNodes(fleetNodes, graph, activeAgentIds, activityScores, maxActivity),
        )
      : layoutFleetStarNodes(graph.nodes, graph, activeAgentIds, activityScores, maxActivity);

  const nodeById = new Map(nodes.map((node) => [node.agentId, node]));
  const edges: ShowcaseForceEdge[] = graph.edges
    .filter((edge) => nodeById.has(edge.from_agent) && nodeById.has(edge.to_agent))
    .map((edge) => {
      const source = nodeById.get(edge.from_agent);
      const target = nodeById.get(edge.to_agent);
      if (source === undefined || target === undefined) {
        throw new Error('Missing showcase star edge endpoint after filter');
      }
      return {
        fromAgent: edge.from_agent,
        toAgent: edge.to_agent,
        kind: edge.kind,
        messageCount: edge.message_count,
        color: resolveOpsEdgeKindStyle(edge.kind).color,
        sourcePosition: [source.x, source.y, source.z] as const,
        targetPosition: [target.x, target.y, target.z] as const,
        edgeShape: 'line' as const,
        pathPoints: [
          [source.x, source.y, source.z] as const,
          [target.x, target.y, target.z] as const,
        ],
      };
    });

  return {
    nodes,
    edges,
    tickCount: 0,
    elapsedMs: 0,
  };
}
