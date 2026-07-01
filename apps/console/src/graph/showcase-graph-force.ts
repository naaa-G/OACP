import type { TraceGraphView } from '@oacp/observability-client';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force-3d';

import { resolveOpsEdgeKindStyle } from './ops-graph-edge.js';
import { isOpsGraphNodeActive } from './ops-graph-node-style.js';
import { showcaseFleetColor } from './showcase-fleet-colors.js';
import {
  computeShowcaseNodeActivityScores,
  SHOWCASE_COLLISION_PADDING,
  showcaseGraphDisplayRadius,
  showcaseGraphNodeRadius,
  SHOWCASE_SMALL_GRAPH_NODE_COUNT,
} from './showcase-graph-node-style.js';
import { layoutShowcaseStarGraph } from './showcase-graph-star-layout.js';
import {
  groupNodesByFleetBucket,
  initialShowcaseFleetClusterPosition,
} from './showcase-graph-fleet-cluster.js';

export interface ShowcaseForceNode {
  readonly agentId: string;
  readonly label: string;
  readonly fleet?: string | undefined;
  readonly role?: string | undefined;
  readonly color: string;
  readonly radius: number;
  readonly isActive: boolean;
  readonly activityScore: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ShowcaseForceEdge {
  readonly fromAgent: string;
  readonly toAgent: string;
  readonly kind: string;
  readonly messageCount: number;
  readonly color: string;
  readonly sourcePosition: readonly [number, number, number];
  readonly targetPosition: readonly [number, number, number];
  readonly edgeShape: 'line' | 'arc';
  readonly pathPoints: readonly (readonly [number, number, number])[];
}

export interface ShowcaseForceLayoutResult {
  readonly nodes: readonly ShowcaseForceNode[];
  readonly edges: readonly ShowcaseForceEdge[];
  readonly tickCount: number;
  readonly elapsedMs: number;
}

export interface ShowcaseForceLayoutOptions {
  readonly tickLimit?: number;
  readonly alphaMin?: number;
}

interface ForceSimNode {
  agentId: string;
  label: string;
  fleet?: string | undefined;
  role?: string | undefined;
  color: string;
  radius: number;
  isActive: boolean;
  activityScore: number;
  x: number;
  y: number;
  z: number;
}

interface ForceSimLink {
  source: string;
  target: string;
}

/** Fibonacci-sphere seed positions for faster 3D force convergence. */
export function initialShowcaseForcePosition(
  index: number,
  total: number,
  spreadRadius = 2.6,
): readonly [number, number, number] {
  if (total <= 1) {
    return [0, 0, 0];
  }

  const phi = Math.acos(-1 + (2 * (index + 0.5)) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  return [
    spreadRadius * Math.cos(theta) * Math.sin(phi),
    spreadRadius * Math.sin(theta) * Math.sin(phi),
    spreadRadius * Math.cos(phi),
  ];
}

export function minShowcaseNodeCenterDistance(nodes: readonly ShowcaseForceNode[]): number {
  if (nodes.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < nodes.length; index += 1) {
    for (let other = index + 1; other < nodes.length; other += 1) {
      const a = nodes[index];
      const b = nodes[other];
      if (a === undefined || b === undefined) {
        continue;
      }
      const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      minDistance = Math.min(minDistance, distance);
    }
  }

  return minDistance;
}

/** Expand small settled graphs so spheres read as distinct in the default camera view. */
export function normalizeShowcaseForceSpread(nodes: ForceSimNode[], nodeCount: number): void {
  if (nodes.length === 0) {
    return;
  }

  const centroid = nodes.reduce(
    (acc, node) => ({
      x: acc.x + node.x,
      y: acc.y + node.y,
      z: acc.z + node.z,
    }),
    { x: 0, y: 0, z: 0 },
  );
  centroid.x /= nodes.length;
  centroid.y /= nodes.length;
  centroid.z /= nodes.length;

  let maxDistance = 0;
  for (const node of nodes) {
    const distance = Math.hypot(node.x - centroid.x, node.y - centroid.y, node.z - centroid.z);
    maxDistance = Math.max(maxDistance, distance + node.radius);
  }

  const targetSpread = Math.max(3.8, Math.min(7.5, 2.4 + nodeCount * 0.45));
  if (maxDistance <= 0.001 || maxDistance >= targetSpread) {
    return;
  }

  const scale = targetSpread / maxDistance;
  for (const node of nodes) {
    node.x = centroid.x + (node.x - centroid.x) * scale;
    node.y = centroid.y + (node.y - centroid.y) * scale;
    node.z = centroid.z + (node.z - centroid.z) * scale;
  }
}

/** Run a 3D force simulation over trace graph nodes/edges (Day 37). */
export function layoutShowcaseForceGraph(
  graph: TraceGraphView,
  activeAgentIds: ReadonlySet<string> = new Set<string>(),
  options: ShowcaseForceLayoutOptions = {},
): ShowcaseForceLayoutResult {
  if (graph.nodes.length <= SHOWCASE_SMALL_GRAPH_NODE_COUNT) {
    return layoutShowcaseStarGraph(graph, activeAgentIds);
  }

  const activityScores = computeShowcaseNodeActivityScores(
    graph.nodes,
    graph.edges,
    activeAgentIds,
  );
  const maxActivity = Math.max(1, ...activityScores.values());

  const simNodes: ForceSimNode[] = [];
  const fleetGroups = groupNodesByFleetBucket(graph.nodes);

  for (const fleetNodes of fleetGroups.values()) {
    fleetNodes.forEach((node, indexWithinFleet) => {
      const isActive = isOpsGraphNodeActive(node.agent_id, activeAgentIds, node.status);
      const activityScore = activityScores.get(node.agent_id) ?? 0;
      const radius = showcaseGraphDisplayRadius(
        showcaseGraphNodeRadius(activityScore, maxActivity, isActive),
        graph.nodes.length,
      );
      const [x, y, z] = initialShowcaseFleetClusterPosition(
        node.fleet,
        indexWithinFleet,
        fleetNodes.length,
      );

      const simNode: ForceSimNode = {
        agentId: node.agent_id,
        label: node.name.trim().length > 0 ? node.name : node.agent_id,
        color: showcaseFleetColor(node.fleet),
        radius,
        isActive,
        activityScore,
        x,
        y,
        z,
      };

      if (node.fleet !== undefined) {
        simNode.fleet = node.fleet;
      }
      if (node.role !== undefined) {
        simNode.role = node.role;
      }

      simNodes.push(simNode);
    });
  }

  const nodeIds = new Set(simNodes.map((node) => node.agentId));
  const simLinks: ForceSimLink[] = graph.edges
    .filter((edge) => nodeIds.has(edge.from_agent) && nodeIds.has(edge.to_agent))
    .map((edge) => ({
      source: edge.from_agent,
      target: edge.to_agent,
    }));

  const simulation = forceSimulation(simNodes, 3)
    .force(
      'link',
      forceLink<ForceSimNode>(simLinks)
        .id((node: ForceSimNode) => node.agentId)
        .distance(2.8)
        .strength(0.85),
    )
    .force('charge', forceManyBody().strength(-92))
    .force('center', forceCenter(0, 0, 0))
    .force(
      'collision',
      forceCollide<ForceSimNode>()
        .radius((node: ForceSimNode) => node.radius + SHOWCASE_COLLISION_PADDING)
        .strength(0.95)
        .iterations(4),
    )
    .stop();

  const tickLimit = options.tickLimit ?? 420;
  const alphaMin = options.alphaMin ?? 0.001;
  const start = performance.now();
  let tickCount = 0;

  while (simulation.alpha() > alphaMin && tickCount < tickLimit) {
    simulation.tick();
    tickCount += 1;
  }

  normalizeShowcaseForceSpread(simNodes, graph.nodes.length);

  const elapsedMs = performance.now() - start;
  const nodeById = new Map(simNodes.map((node) => [node.agentId, node]));

  const edges: ShowcaseForceEdge[] = graph.edges
    .filter((edge) => nodeById.has(edge.from_agent) && nodeById.has(edge.to_agent))
    .map((edge) => {
      const source = nodeById.get(edge.from_agent);
      const target = nodeById.get(edge.to_agent);
      if (source === undefined || target === undefined) {
        throw new Error('Missing showcase force edge endpoint after filter');
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
    nodes: simNodes.map((node) => ({
      agentId: node.agentId,
      label: node.label,
      ...(node.fleet !== undefined ? { fleet: node.fleet } : {}),
      ...(node.role !== undefined ? { role: node.role } : {}),
      color: node.color,
      radius: node.radius,
      isActive: node.isActive,
      activityScore: node.activityScore,
      x: node.x,
      y: node.y,
      z: node.z,
    })),
    edges,
    tickCount,
    elapsedMs,
  };
}
