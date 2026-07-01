import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';
import { buildE2eTraceGraph } from './fixtures/trace-graph.js';
import { buildScaleTraceGraph } from '../src/graph/ops-graph-layout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HERO_OUTPUT = path.join(__dirname, '..', 'public', 'showcase-hero.png');
const DOCS_HERO_OUTPUT = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'docs',
  'public',
  'screenshots',
  'console-showcase-hero.png',
);

async function mockGraphApi(page: import('@playwright/test').Page): Promise<void> {
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

test.describe('Showcase + Ops sync (Day 44)', () => {
  test('mode switch preserves trace and agent selection', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops&agent=agent://coordinator`);

    await expect(page.getByTestId('ops-graph')).toHaveAttribute('data-focus-active', 'true');

    await page.getByTestId('graph-mode-showcase').click();

    await expect(page).toHaveURL(new RegExp(`trace_id=${E2E_TRACE_ID}`));
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-focused-agent',
      'agent://coordinator',
    );

    await page.getByTestId('graph-mode-ops').click();

    await expect(page.getByTestId('ops-graph')).toBeVisible();
    await expect(page.getByTestId('ops-graph')).toHaveAttribute('data-focus-active', 'true');
  });

  test('catalog selection survives ops to showcase switch', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.locator('#agentsPanel button[data-agent-id="agent://coordinator"]').click();

    await page.getByTestId('graph-mode-showcase').click();

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-focused-agent',
      'agent://coordinator',
    );
    await expect(page.getByTestId('showcase-graph-label-pinned-coordinator')).toBeVisible();
  });

  test('showcase to ops switch uses snapshot graph while trace graph API loads', async ({
    page,
  }) => {
    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot: buildE2eSnapshot(E2E_TRACE_ID) }),
      });
    });

    let graphRequests = 0;
    await page.route('**/v1/observability/traces/*/graph', async (route) => {
      graphRequests += 1;
      await new Promise((resolve) => {
        setTimeout(resolve, 1_500);
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, graph: buildE2eTraceGraph(E2E_TRACE_ID) }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);
    await expect(page.getByTestId('showcase-graph')).toBeVisible();

    await page.getByTestId('graph-mode-ops').click();

    await expect(page).toHaveURL(/mode=ops/);
    await expect(page.getByTestId('ops-graph')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByTestId('graph-empty-state')).toHaveCount(0);
    await expect(page.getByText('Loading delegation graph')).toHaveCount(0);
    expect(graphRequests).toBeGreaterThan(0);
  });

  test('png export button is available in ops and showcase modes', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await expect(page.getByTestId('graph-export-png')).toHaveAttribute(
      'data-graph-export-mode',
      'ops',
    );

    await page.getByTestId('graph-mode-showcase').click();

    await expect(page.getByTestId('graph-export-png')).toHaveAttribute(
      'data-graph-export-mode',
      'showcase',
    );
  });

  test('showcase export bridge returns a png data url', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-graph')).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => typeof window.__OACP_EXPORT_SHOWCASE_PNG__ === 'function'),
      )
      .toBe(true);

    const dataUrl = await page.evaluate(async () => {
      return window.__OACP_EXPORT_SHOWCASE_PNG__?.({
        dimensions: { width: 1920, height: 1080 },
      });
    });

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});

test.describe('Showcase hero screenshot (Day 44)', () => {
  test('capture README hero PNG at 1920x1080', async ({ page }) => {
    test.skip(process.env.CAPTURE_HERO !== '1', 'Set CAPTURE_HERO=1 to regenerate hero PNG assets');

    const scaleGraph = buildScaleTraceGraph(27);

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

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(
      `/?trace_id=${E2E_TRACE_ID}&mode=showcase&showcase_layout=sphere&showcase_bloom=medium&presentation=1`,
    );

    await expect(page.getByTestId('showcase-graph')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1_500);

    await page.screenshot({ path: HERO_OUTPUT });
    await page.screenshot({ path: DOCS_HERO_OUTPUT });
  });
});

declare global {
  interface Window {
    __OACP_EXPORT_SHOWCASE_PNG__?: (request?: {
      dimensions?: { width: number; height: number };
    }) => Promise<string | null>;
  }
}
