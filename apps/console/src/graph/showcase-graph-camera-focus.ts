import type { ShowcaseForceNode } from './showcase-graph-force.js';

export const SHOWCASE_NODE_FOCUS_DISTANCE_FACTOR = 6;
export const SHOWCASE_NODE_FOCUS_MIN_DISTANCE = 4.5;

export interface ShowcaseNodeFocusViewport {
  readonly target: readonly [number, number, number];
  readonly cameraPosition: readonly [number, number, number];
}

/** Camera framing for a single selected showcase node (Day 39). */
export function computeShowcaseNodeFocusViewport(
  node: Pick<ShowcaseForceNode, 'x' | 'y' | 'z' | 'radius'>,
): ShowcaseNodeFocusViewport {
  const distance = Math.max(
    SHOWCASE_NODE_FOCUS_MIN_DISTANCE,
    node.radius * SHOWCASE_NODE_FOCUS_DISTANCE_FACTOR,
  );

  return {
    target: [node.x, node.y, node.z],
    cameraPosition: [node.x + distance * 0.14, node.y + distance * 0.18, node.z + distance],
  };
}

export function lerpShowcaseScalar(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

export function lerpShowcaseTuple(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  alpha: number,
): readonly [number, number, number] {
  return [
    lerpShowcaseScalar(from[0], to[0], alpha),
    lerpShowcaseScalar(from[1], to[1], alpha),
    lerpShowcaseScalar(from[2], to[2], alpha),
  ];
}
