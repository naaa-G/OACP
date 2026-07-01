import { describe, expect, it } from 'vitest';

import {
  fibonacciSphereDirection,
  layoutShowcaseSphereGraph,
  SHOWCASE_INNER_BAND_RADIUS,
  SHOWCASE_OUTER_BAND_RADIUS,
  showcaseFleetBandRadius,
} from './showcase-graph-sphere-layout.js';

describe('showcase-graph-sphere-layout', () => {
  it('maps MCPLab fleets to the inner band and demos to the outer band', () => {
    expect(showcaseFleetBandRadius('mcplab')).toBe(SHOWCASE_INNER_BAND_RADIUS);
    expect(showcaseFleetBandRadius('system')).toBe(SHOWCASE_INNER_BAND_RADIUS);
    expect(showcaseFleetBandRadius('startup-demo')).toBe(SHOWCASE_OUTER_BAND_RADIUS);
    expect(showcaseFleetBandRadius(undefined)).toBe(SHOWCASE_OUTER_BAND_RADIUS);
  });

  it('places nodes on sphere shells with raised arc edges', () => {
    const graph = {
      trace_id: 'trace-sphere',
      layout: 'hierarchical' as const,
      max_depth: 1,
      nodes: [
        {
          agent_id: 'agent://mcplab-client',
          name: 'Client',
          depth: 0,
          fleet: 'mcplab',
          status: 'active' as const,
          capabilities: [],
        },
        {
          agent_id: 'agent://mcplab-planner',
          name: 'Planner',
          depth: 1,
          fleet: 'mcplab',
          status: 'active' as const,
          capabilities: [],
        },
        {
          agent_id: 'agent://startup-worker',
          name: 'Startup Worker',
          depth: 1,
          fleet: 'startup-demo',
          status: 'active' as const,
          capabilities: [],
        },
      ],
      edges: [
        {
          from_agent: 'agent://mcplab-client',
          to_agent: 'agent://mcplab-planner',
          kind: 'subtask',
          message_count: 2,
        },
        {
          from_agent: 'agent://mcplab-client',
          to_agent: 'agent://startup-worker',
          kind: 'subtask',
          message_count: 1,
        },
      ],
    };

    const layout = layoutShowcaseSphereGraph(
      graph,
      new Set(graph.nodes.map((node) => node.agent_id)),
    );

    const innerPlanner = layout.nodes.find((node) => node.agentId === 'agent://mcplab-planner');
    const outerWorker = layout.nodes.find((node) => node.agentId === 'agent://startup-worker');

    expect(layout.nodes).toHaveLength(3);
    expect(innerPlanner).toBeDefined();
    expect(outerWorker).toBeDefined();
    expect(Math.hypot(innerPlanner!.x, innerPlanner!.y, innerPlanner!.z)).toBeCloseTo(
      SHOWCASE_INNER_BAND_RADIUS,
      0,
    );
    expect(Math.hypot(outerWorker!.x, outerWorker!.y, outerWorker!.z)).toBeCloseTo(
      SHOWCASE_OUTER_BAND_RADIUS,
      0,
    );
    expect(layout.edges.every((edge) => edge.edgeShape === 'arc')).toBe(true);
    expect(layout.edges.every((edge) => edge.pathPoints.length > 2)).toBe(true);
  });

  it('distributes Fibonacci directions on the unit sphere', () => {
    const first = fibonacciSphereDirection(0, 5);
    const second = fibonacciSphereDirection(1, 5);
    expect(Math.hypot(first[0], first[1], first[2])).toBeCloseTo(1, 5);
    expect(Math.hypot(second[0], second[1], second[2])).toBeCloseTo(1, 5);
  });
});
