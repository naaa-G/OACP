import type { TraceGraphEdge, TraceGraphNode } from '@oacp/observability-client';

import { isOpsGraphNodeActive } from './ops-graph-node-style.js';

export const SHOWCASE_RADIUS_MIN = 0.32;
export const SHOWCASE_RADIUS_MAX = 0.58;
export const SHOWCASE_RADIUS_ACTIVE_BOOST = 0.06;
export const SHOWCASE_DISPLAY_RADIUS_MIN = 0.85;
export const SHOWCASE_DISPLAY_RADIUS_MIN_LARGE = 0.55;
export const SHOWCASE_SMALL_GRAPH_NODE_COUNT = 8;
export const SHOWCASE_COLLISION_PADDING = 0.12;
export const SHOWCASE_NODE_GAP = 0.15;

/** Active-agent status boost applied on top of edge-derived message volume. */
export const SHOWCASE_ACTIVE_ACTIVITY_BOOST = 2;

/** Node radius scales with relative activity (message volume + live status). */
export function showcaseGraphNodeRadius(
  activityScore: number,
  maxActivity: number,
  isActive: boolean,
): number {
  const safeMax = Math.max(1, maxActivity);
  const ratio = Math.min(1, Math.max(0, activityScore / safeMax));
  const base = SHOWCASE_RADIUS_MIN + ratio * (SHOWCASE_RADIUS_MAX - SHOWCASE_RADIUS_MIN);
  return isActive ? base + SHOWCASE_RADIUS_ACTIVE_BOOST : base;
}

/** Enforce a readable on-screen size in the WebGL canvas. */
export function showcaseGraphDisplayRadius(computedRadius: number, nodeCount: number): number {
  const floor =
    nodeCount <= SHOWCASE_SMALL_GRAPH_NODE_COUNT
      ? SHOWCASE_DISPLAY_RADIUS_MIN
      : SHOWCASE_DISPLAY_RADIUS_MIN_LARGE;
  return Math.max(floor, computedRadius);
}

export function computeShowcaseNodeActivityScores(
  nodes: readonly TraceGraphNode[],
  edges: readonly TraceGraphEdge[],
  activeAgentIds: ReadonlySet<string> = new Set<string>(),
): ReadonlyMap<string, number> {
  const scores = new Map<string, number>();

  for (const node of nodes) {
    scores.set(node.agent_id, 0);
  }

  for (const edge of edges) {
    scores.set(edge.from_agent, (scores.get(edge.from_agent) ?? 0) + edge.message_count);
    scores.set(edge.to_agent, (scores.get(edge.to_agent) ?? 0) + edge.message_count);
  }

  for (const node of nodes) {
    if (isOpsGraphNodeActive(node.agent_id, activeAgentIds, node.status)) {
      scores.set(node.agent_id, (scores.get(node.agent_id) ?? 0) + SHOWCASE_ACTIVE_ACTIVITY_BOOST);
    }
  }

  return scores;
}
