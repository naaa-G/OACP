import type { TraceGraphNode } from '@oacp/observability-client';

import { OPS_IDLE_NODE_DIAMETER_PX, opsGraphNodeDiameterPx } from './ops-graph-node-style.js';
import type { OpsGraphNodePosition } from './ops-graph-layout.js';

const ORBIT_PADDING_PX = 72;
const MIN_ORBIT_RADIUS_PX = 120;
const GHOST_SEPARATION_PX = 48;

export interface TraceLayoutBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly centerX: number;
  readonly centerY: number;
}

/** Bounding box of positioned trace (non-ghost) nodes. */
export function computeTraceLayoutBounds(
  traceNodes: readonly TraceGraphNode[],
  positions: ReadonlyMap<string, OpsGraphNodePosition>,
  nodeDiameter: number = OPS_IDLE_NODE_DIAMETER_PX,
): TraceLayoutBounds | undefined {
  if (traceNodes.length === 0) {
    return undefined;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of traceNodes) {
    const position = positions.get(node.agent_id);
    if (position === undefined) {
      continue;
    }

    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + nodeDiameter);
    maxY = Math.max(maxY, position.y + nodeDiameter);
  }

  if (!Number.isFinite(minX)) {
    return undefined;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function orbitRadiusForBounds(bounds: TraceLayoutBounds): number {
  const halfWidth = (bounds.maxX - bounds.minX) / 2;
  const halfHeight = (bounds.maxY - bounds.minY) / 2;
  const baseRadius = Math.hypot(halfWidth, halfHeight) + ORBIT_PADDING_PX;
  return Math.max(baseRadius, MIN_ORBIT_RADIUS_PX);
}

/** Initial orbital positions for registry ghost nodes outside the trace hierarchy. */
export function layoutRegistryGhostOrbit(
  bounds: TraceLayoutBounds,
  ghostAgentIds: readonly string[],
): ReadonlyMap<string, OpsGraphNodePosition> {
  const positions = new Map<string, OpsGraphNodePosition>();
  const count = ghostAgentIds.length;
  if (count === 0) {
    return positions;
  }

  const ghostDiameter = opsGraphNodeDiameterPx(false);
  const radius = orbitRadiusForBounds(bounds) + ghostDiameter / 2;

  ghostAgentIds.forEach((agentId, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    positions.set(agentId, {
      x: bounds.centerX + Math.cos(angle) * radius - ghostDiameter / 2,
      y: bounds.centerY + Math.sin(angle) * radius - ghostDiameter / 2,
    });
  });

  return positions;
}

/** Lightweight repulsion pass — keeps ghosts outside trace bbox without dagre overlap. */
export function refineGhostOrbitPositions(
  traceBounds: TraceLayoutBounds,
  ghostAgentIds: readonly string[],
  initialPositions: ReadonlyMap<string, OpsGraphNodePosition>,
  iterations: number = 24,
): ReadonlyMap<string, OpsGraphNodePosition> {
  const ghostDiameter = opsGraphNodeDiameterPx(false);
  const positions = new Map<string, OpsGraphNodePosition>();
  for (const agentId of ghostAgentIds) {
    const initial = initialPositions.get(agentId);
    if (initial !== undefined) {
      positions.set(agentId, { ...initial });
    }
  }

  const minOrbitRadius = orbitRadiusForBounds(traceBounds) + ghostDiameter / 2;

  for (let step = 0; step < iterations; step += 1) {
    for (const agentId of ghostAgentIds) {
      const current = positions.get(agentId);
      if (current === undefined) {
        continue;
      }

      let x = current.x + ghostDiameter / 2;
      let y = current.y + ghostDiameter / 2;

      const dx = x - traceBounds.centerX;
      const dy = y - traceBounds.centerY;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < minOrbitRadius) {
        const scale = minOrbitRadius / distance;
        x = traceBounds.centerX + dx * scale;
        y = traceBounds.centerY + dy * scale;
      }

      for (const otherId of ghostAgentIds) {
        if (otherId === agentId) {
          continue;
        }
        const other = positions.get(otherId);
        if (other === undefined) {
          continue;
        }

        const ox = other.x + ghostDiameter / 2;
        const oy = other.y + ghostDiameter / 2;
        const sepDx = x - ox;
        const sepDy = y - oy;
        const sepDistance = Math.hypot(sepDx, sepDy) || 1;
        if (sepDistance < GHOST_SEPARATION_PX) {
          const push = (GHOST_SEPARATION_PX - sepDistance) / 2;
          x += (sepDx / sepDistance) * push;
          y += (sepDy / sepDistance) * push;
        }
      }

      positions.set(agentId, {
        x: x - ghostDiameter / 2,
        y: y - ghostDiameter / 2,
      });
    }
  }

  return positions;
}
