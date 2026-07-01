import type { ShowcaseForceNode } from './showcase-graph-force.js';

export interface ShowcaseBounds {
  readonly center: readonly [number, number, number];
  readonly radius: number;
}

export function computeShowcaseBounds(
  nodes: readonly Pick<ShowcaseForceNode, 'x' | 'y' | 'z' | 'radius'>[],
): ShowcaseBounds {
  if (nodes.length === 0) {
    return { center: [0, 0, 0], radius: 4 };
  }

  const center = nodes.reduce(
    (acc, node) => ({
      x: acc.x + node.x,
      y: acc.y + node.y,
      z: acc.z + node.z,
    }),
    { x: 0, y: 0, z: 0 },
  );
  center.x /= nodes.length;
  center.y /= nodes.length;
  center.z /= nodes.length;

  let radius = 0;
  for (const node of nodes) {
    const distance = Math.hypot(node.x - center.x, node.y - center.y, node.z - center.z);
    radius = Math.max(radius, distance + node.radius);
  }

  return {
    center: [center.x, center.y, center.z],
    radius: Math.max(radius, 1.75),
  };
}

/** Camera distance that frames the graph bounding sphere in the viewport. */
export function showcaseCameraDistance(radius: number, fovDeg = 42, margin = 1.55): number {
  return (radius * margin) / Math.tan((fovDeg * Math.PI) / 360);
}

/** Default eye position — slight elevation for depth cues. */
export function showcaseCameraPosition(
  bounds: ShowcaseBounds,
  fovDeg = 42,
): readonly [number, number, number] {
  const distance = showcaseCameraDistance(bounds.radius, fovDeg);
  return [
    bounds.center[0] + distance * 0.12,
    bounds.center[1] + distance * 0.18,
    bounds.center[2] + distance,
  ];
}
