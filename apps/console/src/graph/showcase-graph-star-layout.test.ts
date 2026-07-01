import { describe, expect, it } from 'vitest';

import { layoutShowcaseForceGraph } from './showcase-graph-force.js';
import { layoutShowcaseStarGraph } from './showcase-graph-star-layout.js';

const starGraph = {
  trace_id: 'trace-star',
  layout: 'hierarchical' as const,
  max_depth: 1,
  nodes: [
    {
      agent_id: 'agent://client',
      name: 'Client',
      depth: 0,
      fleet: 'mcplab',
      status: 'active' as const,
      capabilities: [],
    },
    ...['Planner', 'Publisher', 'Researcher', 'Synthesizer'].map((name) => ({
      agent_id: `agent://${name.toLowerCase()}`,
      name,
      depth: 1,
      fleet: 'mcplab',
      status: 'active' as const,
      capabilities: [] as string[],
    })),
  ],
  edges: ['Planner', 'Publisher', 'Researcher', 'Synthesizer'].map((name) => ({
    from_agent: 'agent://client',
    to_agent: `agent://${name.toLowerCase()}`,
    kind: 'subtask',
    message_count: 2,
  })),
};

describe('layoutShowcaseStarGraph', () => {
  it('places MCPLab hub at fleet cluster center with workers on an orbit', () => {
    const layout = layoutShowcaseStarGraph(
      starGraph,
      new Set(starGraph.nodes.map((node) => node.agent_id)),
    );
    const hub = layout.nodes.find((node) => node.agentId === 'agent://client');

    expect(layout.nodes).toHaveLength(5);
    expect(hub).toBeDefined();
    expect(hub!.x).toBeCloseTo(-2.4, 1);
    expect(hub!.y).toBeCloseTo(0.5, 1);
    expect(hub!.radius).toBeGreaterThanOrEqual(0.85);

    for (const worker of layout.nodes.filter((node) => node.agentId !== 'agent://client')) {
      const distance = Math.hypot(worker.x - hub!.x, worker.y - hub!.y, worker.z - hub!.z);
      expect(distance).toBeGreaterThan(2.4);
      expect(worker.radius).toBeGreaterThanOrEqual(0.85);
    }
  });
});

describe('layoutShowcaseForceGraph small traces', () => {
  it('uses star layout for 5-agent MCPLab traces', () => {
    const layout = layoutShowcaseForceGraph(
      starGraph,
      new Set(starGraph.nodes.map((node) => node.agent_id)),
    );

    expect(layout.tickCount).toBe(0);
    expect(layout.nodes.every((node) => node.radius >= 0.85)).toBe(true);
  });
});
