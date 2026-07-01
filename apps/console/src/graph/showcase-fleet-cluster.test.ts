import { describe, expect, it } from 'vitest';

import {
  isShowcaseEdgeFleetHighlighted,
  isShowcaseFleetHighlighted,
  parseShowcaseFleetFilter,
} from './showcase-fleet-filter.js';
import { listShowcaseFleetsInGraph, SHOWCASE_FLEET_ORBITAL_BANDS } from './showcase-fleet-bands.js';
import {
  fleetClusterSeparation,
  groupNodesByFleetBucket,
  initialShowcaseFleetClusterPosition,
} from './showcase-graph-fleet-cluster.js';
import { layoutShowcaseStarGraph } from './showcase-graph-star-layout.js';

describe('showcase-fleet-filter', () => {
  it('parses fleet filter from URL values', () => {
    expect(parseShowcaseFleetFilter('mcplab')).toBe('mcplab');
    expect(parseShowcaseFleetFilter('')).toBeNull();
    expect(parseShowcaseFleetFilter('unknown')).toBeNull();
  });

  it('highlights only the selected fleet', () => {
    expect(isShowcaseFleetHighlighted('mcplab', 'mcplab')).toBe(true);
    expect(isShowcaseFleetHighlighted('startup-demo', 'mcplab')).toBe(false);
    expect(isShowcaseEdgeFleetHighlighted('mcplab', 'startup-demo', 'mcplab')).toBe(true);
  });
});

describe('showcase-fleet-bands', () => {
  it('lists fleets present in graph nodes', () => {
    expect(
      listShowcaseFleetsInGraph([
        { fleet: 'mcplab' },
        { fleet: 'startup-demo' },
        { fleet: 'mcplab' },
      ]),
    ).toEqual(['mcplab', 'startup-demo']);
  });

  it('uses cyan and amber orbital bands for MCPLab and startup demo', () => {
    expect(SHOWCASE_FLEET_ORBITAL_BANDS.mcplab.color).toBe('#5eead4');
    expect(SHOWCASE_FLEET_ORBITAL_BANDS['startup-demo'].color).toBe('#fbbf24');
  });
});

describe('showcase-graph-fleet-cluster', () => {
  it('separates MCPLab and startup demo clusters in star layout', () => {
    const graph = {
      trace_id: 'trace-fleets',
      layout: 'hierarchical' as const,
      max_depth: 1,
      nodes: [
        {
          agent_id: 'agent://mcplab-hub',
          name: 'MCPLab Hub',
          depth: 0,
          fleet: 'mcplab',
          status: 'active' as const,
          capabilities: [],
        },
        {
          agent_id: 'agent://mcplab-worker',
          name: 'MCPLab Worker',
          depth: 1,
          fleet: 'mcplab',
          status: 'active' as const,
          capabilities: [],
        },
        {
          agent_id: 'agent://startup-hub',
          name: 'Startup Hub',
          depth: 0,
          fleet: 'startup-demo',
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
          from_agent: 'agent://mcplab-hub',
          to_agent: 'agent://mcplab-worker',
          kind: 'subtask',
          message_count: 1,
        },
        {
          from_agent: 'agent://startup-hub',
          to_agent: 'agent://startup-worker',
          kind: 'subtask',
          message_count: 1,
        },
      ],
    };

    const layout = layoutShowcaseStarGraph(
      graph,
      new Set(graph.nodes.map((node) => node.agent_id)),
    );

    const mcplabHub = layout.nodes.find((node) => node.agentId === 'agent://mcplab-hub');
    const startupHub = layout.nodes.find((node) => node.agentId === 'agent://startup-hub');

    expect(mcplabHub).toBeDefined();
    expect(startupHub).toBeDefined();
    expect(fleetClusterSeparation(mcplabHub!, startupHub!)).toBeGreaterThan(3.5);
  });

  it('offsets fleet cluster seed positions', () => {
    const mcplab = initialShowcaseFleetClusterPosition('mcplab', 0, 2);
    const startup = initialShowcaseFleetClusterPosition('startup-demo', 0, 2);
    expect(
      Math.hypot(mcplab[0] - startup[0], mcplab[1] - startup[1], mcplab[2] - startup[2]),
    ).toBeGreaterThan(3);
  });

  it('groups nodes by fleet bucket', () => {
    const groups = groupNodesByFleetBucket([
      { fleet: 'mcplab' },
      { fleet: 'startup-demo' },
      { fleet: undefined },
    ]);
    expect(groups.get('mcplab')).toHaveLength(1);
    expect(groups.get('startup-demo')).toHaveLength(1);
    expect(groups.get('external')).toHaveLength(1);
  });
});
