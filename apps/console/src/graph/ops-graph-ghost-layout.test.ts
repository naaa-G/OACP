import { describe, expect, it } from 'vitest';

import {
  computeTraceLayoutBounds,
  layoutRegistryGhostOrbit,
  refineGhostOrbitPositions,
} from './ops-graph-ghost-layout.js';

describe('ops-graph-ghost-layout', () => {
  const traceNodes = [
    {
      agent_id: 'agent://coordinator',
      name: 'Coordinator',
      depth: 0,
      status: 'active' as const,
      capabilities: [],
    },
    {
      agent_id: 'agent://worker',
      name: 'Worker',
      depth: 1,
      status: 'active' as const,
      capabilities: [],
    },
  ];

  const positions = new Map([
    ['agent://coordinator', { x: 100, y: 40 }],
    ['agent://worker', { x: 100, y: 160 }],
  ]);

  it('computes trace layout bounds', () => {
    const bounds = computeTraceLayoutBounds(traceNodes, positions, 52);
    expect(bounds).toBeDefined();
    expect(bounds!.centerX).toBeGreaterThan(0);
  });

  it('places ghost nodes outside trace bounds on an orbit', () => {
    const bounds = computeTraceLayoutBounds(traceNodes, positions, 52)!;
    const ghostIds = ['agent://idle-planner', 'agent://idle-researcher'];
    const orbit = layoutRegistryGhostOrbit(bounds, ghostIds);
    const refined = refineGhostOrbitPositions(bounds, ghostIds, orbit);

    for (const agentId of ghostIds) {
      const position = refined.get(agentId)!;
      const centerX = position.x + 20;
      const centerY = position.y + 20;
      const distance = Math.hypot(centerX - bounds.centerX, centerY - bounds.centerY);
      expect(distance).toBeGreaterThan(80);
    }
  });
});
