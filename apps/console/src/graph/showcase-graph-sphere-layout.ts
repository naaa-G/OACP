import type { TraceGraphNode, TraceGraphView } from '@oacp/observability-client';

import { resolveOpsEdgeKindStyle } from './ops-graph-edge.js';
import { isOpsGraphNodeActive } from './ops-graph-node-style.js';
import { showcaseFleetColor } from './showcase-fleet-colors.js';
import {
  sampleShowcaseGreatCircleArc,
  SHOWCASE_ARC_ELEVATION,
  SHOWCASE_ARC_SEGMENTS,
} from './showcase-graph-arc-edges.js';
import type {
  ShowcaseForceEdge,
  ShowcaseForceLayoutResult,
  ShowcaseForceNode,
} from './showcase-graph-force.js';
import {
  computeShowcaseNodeActivityScores,
  showcaseGraphDisplayRadius,
  showcaseGraphNodeRadius,
} from './showcase-graph-node-style.js';
import { resolveFleetBucket, type CatalogFleetId } from '../utils/fleet-catalog.js';

export const SHOWCASE_INNER_BAND_RADIUS = 4;
export const SHOWCASE_OUTER_BAND_RADIUS = 5.8;

const INNER_BAND_FLEETS = new Set<CatalogFleetId>(['mcplab', 'system']);

/** Fibonacci sphere direction for index `i` out of `total`. */
export function fibonacciSphereDirection(
  index: number,
  total: number,
): readonly [number, number, number] {
  if (total <= 1) {
    return [0, 1, 0];
  }

  const phi = Math.acos(-1 + (2 * (index + 0.5)) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  return [Math.cos(theta) * Math.sin(phi), Math.sin(theta) * Math.sin(phi), Math.cos(phi)];
}

export function showcaseFleetBandRadius(fleet: string | undefined): number {
  const bucket = resolveFleetBucket(fleet);
  return INNER_BAND_FLEETS.has(bucket) ? SHOWCASE_INNER_BAND_RADIUS : SHOWCASE_OUTER_BAND_RADIUS;
}

function positionOnSphereShell(
  index: number,
  total: number,
  shellRadius: number,
): readonly [number, number, number] {
  const [dx, dy, dz] = fibonacciSphereDirection(index, total);
  return [dx * shellRadius, dy * shellRadius, dz * shellRadius];
}

function buildShowcaseSphereEdges(
  graph: TraceGraphView,
  nodeById: ReadonlyMap<string, ShowcaseForceNode>,
): ShowcaseForceEdge[] {
  return graph.edges
    .filter((edge) => nodeById.has(edge.from_agent) && nodeById.has(edge.to_agent))
    .map((edge) => {
      const source = nodeById.get(edge.from_agent);
      const target = nodeById.get(edge.to_agent);
      if (source === undefined || target === undefined) {
        throw new Error('Missing showcase sphere edge endpoint after filter');
      }
      const sourcePosition = [source.x, source.y, source.z] as const;
      const targetPosition = [target.x, target.y, target.z] as const;

      return {
        fromAgent: edge.from_agent,
        toAgent: edge.to_agent,
        kind: edge.kind,
        messageCount: edge.message_count,
        color: resolveOpsEdgeKindStyle(edge.kind).color,
        sourcePosition,
        targetPosition,
        edgeShape: 'arc' as const,
        pathPoints: sampleShowcaseGreatCircleArc(
          sourcePosition,
          targetPosition,
          SHOWCASE_ARC_SEGMENTS,
          SHOWCASE_ARC_ELEVATION,
        ),
      };
    });
}

/** Constellation layout — agents on Fibonacci sphere shells with fleet bands (Day 38). */
export function layoutShowcaseSphereGraph(
  graph: TraceGraphView,
  activeAgentIds: ReadonlySet<string> = new Set<string>(),
): ShowcaseForceLayoutResult {
  const activityScores = computeShowcaseNodeActivityScores(
    graph.nodes,
    graph.edges,
    activeAgentIds,
  );
  const maxActivity = Math.max(1, ...activityScores.values());

  const innerNodes: TraceGraphNode[] = [];
  const outerNodes: TraceGraphNode[] = [];

  for (const node of graph.nodes) {
    if (INNER_BAND_FLEETS.has(resolveFleetBucket(node.fleet))) {
      innerNodes.push(node);
    } else {
      outerNodes.push(node);
    }
  }

  const nodes: ShowcaseForceNode[] = [];

  innerNodes.forEach((node, index) => {
    nodes.push(
      buildSphereNode(
        node,
        index,
        innerNodes.length,
        activeAgentIds,
        activityScores,
        maxActivity,
        graph.nodes.length,
      ),
    );
  });

  outerNodes.forEach((node, index) => {
    nodes.push(
      buildSphereNode(
        node,
        index,
        outerNodes.length,
        activeAgentIds,
        activityScores,
        maxActivity,
        graph.nodes.length,
      ),
    );
  });

  const nodeById = new Map(nodes.map((node) => [node.agentId, node]));

  return {
    nodes,
    edges: buildShowcaseSphereEdges(graph, nodeById),
    tickCount: 0,
    elapsedMs: 0,
  };
}

function buildSphereNode(
  node: TraceGraphNode,
  index: number,
  bandCount: number,
  activeAgentIds: ReadonlySet<string>,
  activityScores: ReadonlyMap<string, number>,
  maxActivity: number,
  totalNodeCount: number,
): ShowcaseForceNode {
  const isActive = isOpsGraphNodeActive(node.agent_id, activeAgentIds, node.status);
  const activityScore = activityScores.get(node.agent_id) ?? 0;
  const radius = showcaseGraphDisplayRadius(
    showcaseGraphNodeRadius(activityScore, maxActivity, isActive),
    totalNodeCount,
  );
  const shellRadius = showcaseFleetBandRadius(node.fleet);
  const [x, y, z] = positionOnSphereShell(index, bandCount, shellRadius);

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
}
