import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';
import { buildE2eTraceGraph } from './fixtures/trace-graph.js';
import { buildScaleTraceGraph } from '../src/graph/ops-graph-layout.js';
import {
  SHOWCASE_MCPLAB_TRACE_MIN_EDGE_COUNT,
  SHOWCASE_MCPLAB_TRACE_NODE_COUNT,
} from '../src/graph/showcase-performance-budget.js';

async function mockBaselineGraphApi(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/v1/observability/snapshot**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, snapshot: buildE2eSnapshot(E2E_TRACE_ID) }),
    });
  });

  await page.route('**/v1/observability/traces/*/graph', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, graph: buildE2eTraceGraph(E2E_TRACE_ID) }),
    });
  });
}

test.describe('Day 45 — Showcase sign-off (Issue #2)', () => {
  test('?mode=showcase deep link loads WebGL graph without legacy placeholder', async ({
    page,
  }) => {
    await mockBaselineGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-graph')).toBeVisible();
    await expect(page.getByTestId('showcase-graph').locator('canvas')).toBeVisible();
    await expect(page.getByTestId('graph-mode-showcase')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('graph-mode-label')).toContainText('Showcase 3D');
    await expect(page.getByTestId('graph-mode-coming-soon')).toHaveCount(0);
  });

  test('graph mode toggle syncs URL mode param without page reload', async ({ page }) => {
    await mockBaselineGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await expect(page.getByTestId('ops-graph')).toBeVisible();
    await page.getByTestId('graph-mode-showcase').click();

    await expect(page).toHaveURL(/mode=showcase/);
    await expect(page.getByTestId('showcase-graph')).toBeVisible();
    await expect(page.getByTestId('ops-graph')).toBeHidden();

    await page.getByTestId('graph-mode-ops').click();
    await expect(page).toHaveURL(/mode=ops/);
    await expect(page.getByTestId('ops-graph')).toBeVisible();
  });

  test('27-agent MCPLab-scale trace renders force layout with visible delegation edges', async ({
    page,
  }) => {
    const scaleGraph = buildScaleTraceGraph(SHOWCASE_MCPLAB_TRACE_NODE_COUNT);

    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot: buildE2eSnapshot(E2E_TRACE_ID) }),
      });
    });

    await page.route('**/v1/observability/traces/*/graph', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, graph: scaleGraph }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    const showcaseGraph = page.getByTestId('showcase-graph');
    await expect(showcaseGraph).toBeVisible();
    await expect(showcaseGraph).toHaveAttribute('data-showcase-layout', 'force');
    await expect(showcaseGraph).toHaveAttribute(
      'data-showcase-node-count',
      String(SHOWCASE_MCPLAB_TRACE_NODE_COUNT),
    );
    await expect(
      Number(await showcaseGraph.getAttribute('data-showcase-edge-count')),
    ).toBeGreaterThan(SHOWCASE_MCPLAB_TRACE_MIN_EDGE_COUNT);
    await expect(showcaseGraph).toHaveAttribute('data-showcase-edge-animation', 'enabled');
    await expect(showcaseGraph.locator('canvas')).toBeVisible();
  });

  test('Showcase is launch-demo ready: export hook, present control, trace context preserved', async ({
    page,
  }) => {
    await mockBaselineGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase&agent=agent%3A%2F%2Fcoordinator`);

    await expect(page.getByTestId('showcase-graph')).toBeVisible();
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-focused-agent',
      'agent://coordinator',
    );
    await expect(page.getByTestId('showcase-presentation-controls')).toBeVisible();
    await expect(page.getByTestId('showcase-presentation-enter')).toBeVisible();
    await expect(page.getByTestId('graph-export-png')).toBeVisible();

    const exportReady = await page.evaluate(
      () => typeof window.__OACP_EXPORT_SHOWCASE_PNG__ === 'function',
    );
    expect(exportReady).toBe(true);
  });
});
