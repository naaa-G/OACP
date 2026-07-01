import { describe, expect, it } from 'vitest';

import { layoutOpsTraceGraph } from './ops-graph-layout.js';
import { buildScaleTraceGraph } from './ops-graph-layout.js';
import { layoutShowcaseForceGraph } from './showcase-graph-force.js';
import {
  OPS_LAYOUT_MS_BUDGET_100,
  SHOWCASE_FORCE_LAYOUT_MS_BUDGET_100,
  SHOWCASE_FORCE_LAYOUT_MS_BUDGET_30,
  SHOWCASE_FPS_BUDGETS,
  showcaseForceLayoutMsBudget,
  showcaseFpsBudget,
} from './showcase-performance-budget.js';

describe('showcase performance budgets (Day 45)', () => {
  it('exports FPS targets for 30/100 nodes on dedicated and integrated GPUs', () => {
    expect(SHOWCASE_FPS_BUDGETS).toHaveLength(4);
    expect(showcaseFpsBudget(30, 'dedicated')).toBe(60);
    expect(showcaseFpsBudget(30, 'integrated')).toBe(45);
    expect(showcaseFpsBudget(100, 'dedicated')).toBe(45);
    expect(showcaseFpsBudget(100, 'integrated')).toBe(30);
  });

  it('selects force layout ms budget by node count tier', () => {
    expect(showcaseForceLayoutMsBudget(27)).toBe(SHOWCASE_FORCE_LAYOUT_MS_BUDGET_30);
    expect(showcaseForceLayoutMsBudget(30)).toBe(SHOWCASE_FORCE_LAYOUT_MS_BUDGET_30);
    expect(showcaseForceLayoutMsBudget(31)).toBe(SHOWCASE_FORCE_LAYOUT_MS_BUDGET_100);
    expect(showcaseForceLayoutMsBudget(100)).toBe(SHOWCASE_FORCE_LAYOUT_MS_BUDGET_100);
  });

  it('settles 30-node Showcase force layout within budget', () => {
    const graph = buildScaleTraceGraph(30);
    const layout = layoutShowcaseForceGraph(graph);

    expect(layout.nodes).toHaveLength(30);
    expect(layout.elapsedMs).toBeLessThan(SHOWCASE_FORCE_LAYOUT_MS_BUDGET_30);
  });

  it('settles 100-node Showcase force layout within budget', () => {
    const graph = buildScaleTraceGraph(100);
    const layout = layoutShowcaseForceGraph(graph);

    expect(layout.nodes).toHaveLength(100);
    expect(layout.elapsedMs).toBeLessThan(SHOWCASE_FORCE_LAYOUT_MS_BUDGET_100);
  });

  it('lays out 100-node Ops graph within Day 35 budget', () => {
    const graph = buildScaleTraceGraph(100);
    const start = performance.now();
    layoutOpsTraceGraph(graph, 1280, 900);
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(OPS_LAYOUT_MS_BUDGET_100);
  });
});
