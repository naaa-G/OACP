import type { Viewport } from '@xyflow/react';

/** Imperative bridge for Ops graph custom nodes/edges (React Flow portal-safe). */
export const opsGraphInteractionApi = {
  setHoveredEdgeId: null as ((edgeId: string | undefined) => void) | null,
  togglePinLabel: null as ((agentId: string) => void) | null,
  fitView: null as (() => void) | null,
  resetView: null as (() => void) | null,
  getViewport: null as (() => Viewport | undefined) | null,
  zoomToNode: null as ((agentId: string) => void) | null,
};
