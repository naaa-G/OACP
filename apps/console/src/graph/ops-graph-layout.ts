import dagre from '@dagrejs/dagre';

import type { TraceGraphEdge, TraceGraphNode, TraceGraphView } from '@oacp/observability-client';

import {
  computeTraceLayoutBounds,
  layoutRegistryGhostOrbit,
  refineGhostOrbitPositions,
} from './ops-graph-ghost-layout.js';
import {
  isOpsGraphNodeActive,
  OPS_ACTIVE_NODE_DIAMETER_PX,
  OPS_IDLE_NODE_DIAMETER_PX,
  opsGraphNodeDiameterPx,
} from './ops-graph-node-style.js';

/** @deprecated Use `OPS_IDLE_NODE_DIAMETER_PX` / `OPS_ACTIVE_NODE_DIAMETER_PX` (Day 30). */
export const OPS_NODE_DIAMETER_PX = OPS_ACTIVE_NODE_DIAMETER_PX;
export const OPS_MIN_NODE_GAP_PX = 16;

export {
  isOpsGraphNodeActive,
  OPS_ACTIVE_NODE_DIAMETER_PX,
  OPS_IDLE_NODE_DIAMETER_PX,
  opsGraphNodeDiameterPx,
};

export const OPS_DAGRE_OPTIONS = {
  rankdir: 'TB' as const,
  nodesep: 52,
  ranksep: 72,
  marginx: 32,
  marginy: 32,
};

export interface OpsGraphNodePosition {
  readonly x: number;
  readonly y: number;
}

export interface OpsGraphLayoutResult {
  readonly positions: ReadonlyMap<string, OpsGraphNodePosition>;
  readonly width: number;
  readonly height: number;
}

function graphNodeSize(
  node: TraceGraphNode,
  activeAgentIds: ReadonlySet<string>,
): { width: number; height: number } {
  const isActive = isOpsGraphNodeActive(node.agent_id, activeAgentIds, node.status);
  const size = opsGraphNodeDiameterPx(isActive);
  return { width: size, height: size };
}

/** Hierarchical top-down layout for trace agent nodes (dagre + delegation depth). */
export function layoutOpsTraceGraph(
  graph: TraceGraphView,
  containerWidth: number,
  containerHeight: number,
  activeAgentIds: ReadonlySet<string> = new Set<string>(),
  ghostAgentIds: ReadonlySet<string> = new Set<string>(),
): OpsGraphLayoutResult {
  const traceNodes = graph.nodes.filter((node) => !ghostAgentIds.has(node.agent_id));

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph(OPS_DAGRE_OPTIONS);

  for (const node of traceNodes) {
    const size = graphNodeSize(node, activeAgentIds);
    dagreGraph.setNode(node.agent_id, {
      width: size.width,
      height: size.height,
    });
  }

  for (const edge of graph.edges) {
    if (!dagreGraph.hasNode(edge.from_agent) || !dagreGraph.hasNode(edge.to_agent)) {
      continue;
    }
    dagreGraph.setEdge(edge.from_agent, edge.to_agent);
  }

  // Dagre graphlib typings are wider than @dagrejs/dagre runtime accepts.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- dagre graphlib Graph<any>
  dagre.layout(dagreGraph);

  const positions = new Map<string, OpsGraphNodePosition>();
  let maxX = OPS_ACTIVE_NODE_DIAMETER_PX;
  let maxY = OPS_ACTIVE_NODE_DIAMETER_PX;

  for (const node of traceNodes) {
    const layoutNode = dagreGraph.node(node.agent_id) as { x: number; y: number } | undefined;
    if (layoutNode === undefined) {
      continue;
    }

    const size = graphNodeSize(node, activeAgentIds);
    const x = layoutNode.x - size.width / 2;
    const y = layoutNode.y - size.height / 2;
    positions.set(node.agent_id, { x, y });
    maxX = Math.max(maxX, x + size.width);
    maxY = Math.max(maxY, y + size.height);
  }

  const ghostIds = [...ghostAgentIds];
  if (ghostIds.length > 0) {
    const bounds = computeTraceLayoutBounds(traceNodes, positions, OPS_ACTIVE_NODE_DIAMETER_PX);
    if (bounds !== undefined) {
      const orbit = layoutRegistryGhostOrbit(bounds, ghostIds);
      const refined = refineGhostOrbitPositions(bounds, ghostIds, orbit);
      for (const [agentId, position] of refined) {
        positions.set(agentId, position);
        maxX = Math.max(maxX, position.x + OPS_IDLE_NODE_DIAMETER_PX);
        maxY = Math.max(maxY, position.y + OPS_IDLE_NODE_DIAMETER_PX);
      }
    }
  }

  return {
    positions,
    width: Math.max(containerWidth, maxX + OPS_DAGRE_OPTIONS.marginx),
    height: Math.max(containerHeight, maxY + OPS_DAGRE_OPTIONS.marginy),
  };
}

/** Minimum center distance between node pairs — used to guard against overlaps at scale. */
export function minOpsNodeCenterDistance(
  positions: ReadonlyMap<string, OpsGraphNodePosition>,
  nodeDiameter: number = OPS_ACTIVE_NODE_DIAMETER_PX,
): number {
  const centers = [...positions.entries()].map(([agentId, position]) => ({
    agentId,
    x: position.x + nodeDiameter / 2,
    y: position.y + nodeDiameter / 2,
  }));

  if (centers.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;
  for (let left = 0; left < centers.length; left += 1) {
    for (let right = left + 1; right < centers.length; right += 1) {
      const a = centers[left];
      const b = centers[right];
      if (a === undefined || b === undefined) {
        continue;
      }
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      minDistance = Math.min(minDistance, distance);
    }
  }

  return minDistance;
}

export function buildScaleTraceGraph(agentCount: number): TraceGraphView {
  const nodes: TraceGraphNode[] = [
    {
      agent_id: 'agent://coordinator',
      name: 'Coordinator',
      depth: 0,
      fleet: 'mcplab',
      role: 'coordinator',
      status: 'active',
      capabilities: ['orchestrate'],
    },
  ];
  const edges: TraceGraphEdge[] = [];

  let nextId = 1;
  let previousLayer = ['agent://coordinator'];
  let depth = 1;

  while (nodes.length < agentCount) {
    const currentLayer: string[] = [];
    for (const parentId of previousLayer) {
      for (let child = 0; child < 3 && nodes.length < agentCount; child += 1) {
        const agentId = `agent://mcplab-worker-${nextId}`;
        nextId += 1;
        nodes.push({
          agent_id: agentId,
          name: `Worker ${nextId}`,
          depth,
          fleet: 'mcplab',
          role: 'coder',
          status: 'active',
          capabilities: ['echo'],
        });
        edges.push({
          from_agent: parentId,
          to_agent: agentId,
          kind: 'subtask',
          message_count: 1,
        });
        currentLayer.push(agentId);
      }
    }

    if (currentLayer.length === 0) {
      break;
    }

    previousLayer = currentLayer;
    depth += 1;
  }

  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);

  return {
    trace_id: 'scale-test-trace',
    layout: 'hierarchical',
    max_depth: maxDepth,
    nodes,
    edges,
  };
}
