/** 2D position for an agent node on the legacy circular graph. */
export interface RingGraphPosition {
  readonly x: number;
  readonly y: number;
}

export interface RingGraphLayout {
  readonly width: number;
  readonly height: number;
  readonly positions: ReadonlyMap<string, RingGraphPosition>;
}

const MIN_CANVAS_WIDTH = 400;
const MIN_CANVAS_HEIGHT = 280;
const RING_RADIUS_RATIO = 0.34;

/**
 * Circular ring layout — parity with legacy playground `layoutNodes`.
 * Agents are placed evenly on a ring centered in the viewport.
 */
export function layoutRingNodes(
  agentIds: readonly string[],
  width: number,
  height: number,
): ReadonlyMap<string, RingGraphPosition> {
  const positions = new Map<string, RingGraphPosition>();
  const count = agentIds.length;

  if (count === 0) {
    return positions;
  }

  const canvasWidth = Math.max(width, MIN_CANVAS_WIDTH);
  const canvasHeight = Math.max(height, MIN_CANVAS_HEIGHT);
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const densityFactor = count <= 1 ? 0.45 : Math.min(1, Math.max(0.5, count / 14));
  const radius = Math.min(canvasWidth, canvasHeight) * RING_RADIUS_RATIO * densityFactor;

  agentIds.forEach((id, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    positions.set(id, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  });

  return positions;
}

/** Resolve which agent IDs to place on the ring (registry first, else trace roster). */
export function ringGraphAgentIds(
  registeredAgentIds: readonly string[],
  activeAgentIds: ReadonlySet<string>,
): readonly string[] {
  if (registeredAgentIds.length > 0) {
    return registeredAgentIds;
  }
  return [...activeAgentIds];
}

export function buildRingGraphLayout(
  agentIds: readonly string[],
  width: number,
  height: number,
): RingGraphLayout {
  const canvasWidth = Math.max(width, MIN_CANVAS_WIDTH);
  const canvasHeight = Math.max(height, MIN_CANVAS_HEIGHT);

  return {
    width: canvasWidth,
    height: canvasHeight,
    positions: layoutRingNodes(agentIds, canvasWidth, canvasHeight),
  };
}
