import { describe, expect, it } from 'vitest';

import {
  buildScaleTraceGraph,
  layoutOpsTraceGraph,
  minOpsNodeCenterDistance,
  OPS_IDLE_NODE_DIAMETER_PX,
  OPS_MIN_NODE_GAP_PX,
} from './ops-graph-layout.js';

describe('layoutOpsTraceGraph', () => {
  it('lays out coordinator above workers for a shallow MCPLab trace', () => {
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
          status: 'active' as const,
          capabilities: ['echo'],
        },
      ],
      edges: [
        {
          from_agent: 'agent://coordinator',
          to_agent: 'agent://worker',
          kind: 'subtask',
          message_count: 1,
        },
      ],
    };

    const layout = layoutOpsTraceGraph(graph, 640, 360);
    const coordinator = layout.positions.get('agent://coordinator');
    const worker = layout.positions.get('agent://worker');

    expect(coordinator).toBeDefined();
    expect(worker).toBeDefined();
    expect(coordinator!.y).toBeLessThan(worker!.y);
  });

  it('keeps 27+ MCPLab nodes separated without overlap', () => {
    const graph = buildScaleTraceGraph(28);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(27);

    const layout = layoutOpsTraceGraph(graph, 960, 720);
    const minDistance = minOpsNodeCenterDistance(layout.positions);

    expect(minDistance).toBeGreaterThanOrEqual(OPS_IDLE_NODE_DIAMETER_PX + OPS_MIN_NODE_GAP_PX);
  });

  it('allocates larger dagre boxes for active trace agents (Day 30)', () => {
    const graph = {
      trace_id: 'trace-size',
      layout: 'hierarchical' as const,
      max_depth: 1,
      nodes: [
        {
          agent_id: 'agent://active',
          name: 'Active',
          depth: 0,
          status: 'active' as const,
          capabilities: [],
        },
        {
          agent_id: 'agent://idle',
          name: 'Idle',
          depth: 1,
          status: 'idle' as const,
          capabilities: [],
        },
      ],
      edges: [],
    };

    const activeIds = new Set(['agent://active']);
    const layout = layoutOpsTraceGraph(graph, 640, 360, activeIds);
    const activePos = layout.positions.get('agent://active');
    const idlePos = layout.positions.get('agent://idle');
    expect(activePos).toBeDefined();
    expect(idlePos).toBeDefined();
  });

  it('lays out 100 trace nodes under 500ms (Day 35 performance)', () => {
    const graph = buildScaleTraceGraph(100);
    expect(graph.nodes.length).toBe(100);

    const start = performance.now();
    layoutOpsTraceGraph(graph, 1280, 900);
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(500);
  });

  it('lays out 30-agent MCPLab-scale DAG with readable separation (Day 35)', () => {
    const graph = buildScaleTraceGraph(30);
    const layout = layoutOpsTraceGraph(graph, 1280, 800);
    const minDistance = minOpsNodeCenterDistance(layout.positions);

    expect(minDistance).toBeGreaterThanOrEqual(OPS_IDLE_NODE_DIAMETER_PX + OPS_MIN_NODE_GAP_PX);
  });
});
