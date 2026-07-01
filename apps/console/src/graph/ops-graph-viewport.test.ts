import { describe, expect, it } from 'vitest';

import type { Node } from '@xyflow/react';

import {
  OPS_GRAPH_FIT_PADDING,
  OPS_GRAPH_NODE_FOCUS_ZOOM,
  resolveOpsNodeCenter,
  snapshotOpsViewport,
} from './ops-graph-viewport.js';
import { OPS_ACTIVE_NODE_DIAMETER_PX, OPS_IDLE_NODE_DIAMETER_PX } from './ops-graph-node-style.js';

describe('ops-graph-viewport', () => {
  it('exports enterprise-friendly defaults', () => {
    expect(OPS_GRAPH_FIT_PADDING).toBeGreaterThan(0);
    expect(OPS_GRAPH_FIT_PADDING).toBeLessThan(0.5);
    expect(OPS_GRAPH_NODE_FOCUS_ZOOM).toBeGreaterThan(1);
  });

  it('resolves node center from layout position and visual diameter', () => {
    const node: Node = {
      id: 'agent://worker',
      type: 'opsAgent',
      position: { x: 100, y: 200 },
      data: {},
    };

    const activeCenter = resolveOpsNodeCenter(node, true);
    expect(activeCenter.x).toBe(100 + OPS_ACTIVE_NODE_DIAMETER_PX / 2);
    expect(activeCenter.y).toBe(200 + OPS_ACTIVE_NODE_DIAMETER_PX / 2);

    const idleCenter = resolveOpsNodeCenter(node, false);
    expect(idleCenter.x).toBe(100 + OPS_IDLE_NODE_DIAMETER_PX / 2);
    expect(idleCenter.y).toBe(200 + OPS_IDLE_NODE_DIAMETER_PX / 2);
  });

  it('snapshots viewport coordinates', () => {
    expect(snapshotOpsViewport({ x: 12, y: -8, zoom: 0.75 })).toEqual({
      x: 12,
      y: -8,
      zoom: 0.75,
    });
  });
});
