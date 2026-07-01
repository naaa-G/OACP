import { describe, expect, it } from 'vitest';

import { buildScaleTraceGraph } from './ops-graph-layout.js';
import { layoutShowcaseForceGraph, minShowcaseNodeCenterDistance } from './showcase-graph-force.js';
import {
  computeShowcaseNodeActivityScores,
  SHOWCASE_NODE_GAP,
  showcaseGraphNodeRadius,
} from './showcase-graph-node-style.js';
import { SHOWCASE_FORCE_LAYOUT_MS_BUDGET_30 } from './showcase-performance-budget.js';

describe('layoutShowcaseForceGraph', () => {
  it('maps trace graph nodes and edges into settled 3D positions', () => {
    const graph = {
      trace_id: 'trace-1',
      layout: 'hierarchical' as const,
      max_depth: 1,
      nodes: [
        {
          agent_id: 'agent://coordinator',
          name: 'Coordinator',
          depth: 0,
          fleet: 'mcplab',
          role: 'coordinator',
          status: 'active' as const,
          capabilities: ['orchestrate'],
        },
        {
          agent_id: 'agent://worker',
          name: 'Worker',
          depth: 1,
          fleet: 'mcplab',
          role: 'coder',
          status: 'idle' as const,
          capabilities: ['echo'],
        },
      ],
      edges: [
        {
          from_agent: 'agent://coordinator',
          to_agent: 'agent://worker',
          kind: 'subtask',
          message_count: 3,
        },
      ],
    };

    const layout = layoutShowcaseForceGraph(graph, new Set(['agent://coordinator']));

    expect(layout.nodes).toHaveLength(2);
    expect(layout.edges).toHaveLength(1);
    expect(layout.nodes[0]?.color).toBe('#5eead4');
    expect(layout.nodes[0]?.radius).toBeGreaterThanOrEqual(0.85);
    expect(layout.nodes[0]?.activityScore).toBeGreaterThan(layout.nodes[1]?.activityScore ?? 0);
    expect(layout.elapsedMs).toBeLessThan(SHOWCASE_FORCE_LAYOUT_MS_BUDGET_30);
  });

  it('separates MCPLab star hub from worker nodes', () => {
    const graph = {
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

    const layout = layoutShowcaseForceGraph(
      graph,
      new Set(graph.nodes.map((node) => node.agent_id)),
    );
    const hub = layout.nodes.find((node) => node.agentId === 'agent://client');

    expect(layout.nodes).toHaveLength(5);
    expect(hub).toBeDefined();

    for (const worker of layout.nodes.filter((node) => node.agentId !== 'agent://client')) {
      const distance = Math.hypot(worker.x - hub!.x, worker.y - hub!.y, worker.z - hub!.z);
      expect(distance).toBeGreaterThan(hub!.radius + worker.radius);
    }
  });

  it('settles 30-node MCPLab trace within 3 seconds', () => {
    const graph = buildScaleTraceGraph(30);
    const layout = layoutShowcaseForceGraph(graph);

    expect(layout.nodes).toHaveLength(30);
    expect(layout.elapsedMs).toBeLessThan(SHOWCASE_FORCE_LAYOUT_MS_BUDGET_30);
    expect(layout.tickCount).toBeGreaterThan(0);
  });

  it('keeps 27+ nodes separated without excessive overlap', () => {
    const graph = buildScaleTraceGraph(28);
    const layout = layoutShowcaseForceGraph(graph);

    let overlapViolations = 0;
    for (let index = 0; index < layout.nodes.length; index += 1) {
      for (let other = index + 1; other < layout.nodes.length; other += 1) {
        const a = layout.nodes[index];
        const b = layout.nodes[other];
        if (a === undefined || b === undefined) {
          continue;
        }
        const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        const required = a.radius + b.radius + SHOWCASE_NODE_GAP * 0.5;
        if (distance < required) {
          overlapViolations += 1;
        }
      }
    }

    expect(overlapViolations).toBeLessThanOrEqual(Math.ceil(layout.nodes.length * 0.05));
    expect(minShowcaseNodeCenterDistance(layout.nodes)).toBeGreaterThan(SHOWCASE_NODE_GAP);
  });
});

describe('showcaseGraphNodeRadius', () => {
  it('scales radius with activity score and active boost', () => {
    const scores = computeShowcaseNodeActivityScores(
      [
        {
          agent_id: 'agent://hot',
          name: 'Hot',
          depth: 0,
          status: 'active',
          capabilities: [],
        },
        {
          agent_id: 'agent://cold',
          name: 'Cold',
          depth: 1,
          status: 'idle',
          capabilities: [],
        },
      ],
      [
        {
          from_agent: 'agent://hot',
          to_agent: 'agent://cold',
          kind: 'subtask',
          message_count: 8,
        },
      ],
      new Set(['agent://hot']),
    );

    const hotRadius = showcaseGraphNodeRadius(scores.get('agent://hot') ?? 0, 10, true);
    const coldRadius = showcaseGraphNodeRadius(scores.get('agent://cold') ?? 0, 10, false);

    expect(hotRadius).toBeGreaterThan(coldRadius);
  });
});
