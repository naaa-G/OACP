import type { Node, ReactFlowInstance, Viewport } from '@xyflow/react';

import { opsGraphNodeDiameterPx } from './ops-graph-node-style.js';

/** Default padding ratio when fitting the full trace DAG into the viewport. */
export const OPS_GRAPH_FIT_PADDING = 0.18;

/** Target zoom when double-clicking a node (clamped by React Flow min/max). */
export const OPS_GRAPH_NODE_FOCUS_ZOOM = 1.35;

/** Delay before a single click toggles a pinned label (avoids pin on double-click). */
export const OPS_GRAPH_CLICK_PIN_DELAY_MS = 250;

export interface OpsGraphViewportSnapshot {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export function resolveOpsNodeCenter(
  node: Node,
  isActive: boolean,
): { readonly x: number; readonly y: number } {
  const diameter = opsGraphNodeDiameterPx(isActive);
  return {
    x: node.position.x + diameter / 2,
    y: node.position.y + diameter / 2,
  };
}

export function snapshotOpsViewport(viewport: Viewport): OpsGraphViewportSnapshot {
  return { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
}

export function fitOpsGraphView(
  instance: ReactFlowInstance,
  options?: { readonly padding?: number; readonly duration?: number },
): OpsGraphViewportSnapshot {
  void instance.fitView({
    padding: options?.padding ?? OPS_GRAPH_FIT_PADDING,
    duration: options?.duration ?? 180,
  });
  return snapshotOpsViewport(instance.getViewport());
}

export function resetOpsGraphView(
  instance: ReactFlowInstance,
  baseline: OpsGraphViewportSnapshot | undefined,
): OpsGraphViewportSnapshot {
  if (baseline !== undefined) {
    void instance.setViewport(baseline, { duration: 180 });
    return baseline;
  }

  return fitOpsGraphView(instance, { duration: 180 });
}

export function zoomOpsGraphToNode(
  instance: ReactFlowInstance,
  node: Node,
  isActive: boolean,
): void {
  const center = resolveOpsNodeCenter(node, isActive);
  void instance.setCenter(center.x, center.y, {
    zoom: OPS_GRAPH_NODE_FOCUS_ZOOM,
    duration: 200,
  });
}
