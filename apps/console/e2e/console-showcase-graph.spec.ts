import { expect, test } from '@playwright/test';

import {
  buildE2eSnapshot,
  buildRunningE2eSnapshot,
  E2E_TRACE_ID,
  E2E_SECOND_TRACE_ID,
} from './fixtures/snapshot.js';
import { buildE2eTraceGraph, buildMultiFleetE2eTraceGraph } from './fixtures/trace-graph.js';
import { buildScaleTraceGraph } from '../src/graph/ops-graph-layout.js';
import { seedFastReconcileInterval } from './helpers/live-feed.js';

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

test.describe('Showcase 3D graph scaffold (Day 36)', () => {
  test('showcase mode renders WebGL canvas with force layout from trace graph', async ({
    page,
  }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    const showcaseGraph = page.getByTestId('showcase-graph');
    await expect(showcaseGraph).toBeVisible({ timeout: 20_000 });
    await expect(showcaseGraph).toHaveAttribute('data-showcase-layout', 'force');
    await expect(showcaseGraph).toHaveAttribute('data-showcase-node-count', '2');
    await expect(showcaseGraph).toHaveAttribute('data-showcase-edge-count', '1');
    await expect(showcaseGraph.locator('canvas')).toBeVisible();
    await expect(page.getByTestId('graph-mode-coming-soon')).toHaveCount(0);
    await expect(page.getByTestId('graph-mode-label')).toContainText('Showcase 3D');
  });

  test('switches between ops and showcase without page reload', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await expect(page.getByTestId('ops-graph')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('graph-mode-ops')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('graph-mode-showcase').click();

    await expect(page).toHaveURL(/mode=showcase/);
    await expect(page.getByTestId('showcase-graph')).toBeVisible();
    await expect(page.getByTestId('ops-graph')).toBeHidden();
    await expect(page.getByTestId('graph-mode-showcase')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('graph-mode-ops').click();

    await expect(page).toHaveURL(/mode=ops/);
    await expect(page.getByTestId('ops-graph')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('showcase-graph')).toBeHidden();
  });

  test('orbit controls canvas remains interactive after mode switch', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    const showcaseGraph = page.getByTestId('showcase-graph');
    await expect(showcaseGraph).toBeVisible({ timeout: 20_000 });
    await expect(showcaseGraph.locator('canvas')).toHaveCount(1);

    await showcaseGraph.click({ position: { x: 220, y: 180 } });
    await page.mouse.wheel(0, -200);

    await expect(showcaseGraph).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('graph-mode-showcase')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Showcase 3D force layout (Day 37)', () => {
  test('MCPLab 27-agent trace renders in 3D force layout', async ({ page }) => {
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

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    const showcaseGraph = page.getByTestId('showcase-graph');
    await expect(showcaseGraph).toBeVisible({ timeout: 20_000 });
    await expect(showcaseGraph).toHaveAttribute('data-showcase-layout', 'force');
    await expect(showcaseGraph).toHaveAttribute('data-showcase-node-count', '27');
    await expect(
      Number(await showcaseGraph.getAttribute('data-showcase-edge-count')),
    ).toBeGreaterThan(20);
    await expect(showcaseGraph.locator('canvas')).toBeVisible();
  });

  test('showcase loading state waits for trace graph before rendering force layout', async ({
    page,
  }) => {
    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot: buildE2eSnapshot(E2E_TRACE_ID) }),
      });
    });

    let releaseGraph: (() => void) | undefined;
    const graphGate = new Promise<void>((resolve) => {
      releaseGraph = resolve;
    });

    let graphRequests = 0;
    await page.route('**/v1/observability/traces/*/graph', async (route) => {
      graphRequests += 1;
      await graphGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, graph: buildE2eTraceGraph(E2E_TRACE_ID) }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.locator('#graphPanel')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByText(/Loading delegation graph/i)).toBeVisible();

    releaseGraph?.();
    await expect(page.getByTestId('showcase-graph')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-layout',
      'force',
    );
    await expect(page.locator('#graphPanel')).toHaveAttribute('aria-busy', 'false');
    expect(graphRequests).toBeGreaterThan(0);
  });
});

test.describe('Showcase hover labels + selection (Day 39)', () => {
  test('default showcase view renders no floating labels', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-visible-label-count',
      '0',
    );
    await expect(page.locator('[data-testid^="showcase-graph-label-pinned-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="showcase-graph-label-hover-"]')).toHaveCount(0);
  });

  test('catalog selection pins a label and focuses the showcase graph', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await page.locator('button[data-agent-id="agent://coordinator"]').click();

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-focused-agent',
      'agent://coordinator',
    );
    await expect(page.getByTestId('showcase-graph-label-pinned-coordinator')).toBeVisible();
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-visible-label-count',
      '1',
    );
  });

  test('escape clears showcase selection label', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase&agent=agent://coordinator`);

    await expect(page.getByTestId('showcase-graph-label-pinned-coordinator')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-focused-agent',
      '',
    );
    await expect(page.locator('[data-testid^="showcase-graph-label-pinned-"]')).toHaveCount(0);
  });
});

test.describe('Showcase sphere constellation layout (Day 38)', () => {
  test('sphere layout toggle renders arc edges and updates URL', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-layout-toggle')).toBeVisible();
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-layout',
      'force',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-edge-shape',
      'line',
    );

    await page.getByTestId('showcase-layout-sphere').click();

    await expect(page).toHaveURL(/showcase_layout=sphere/);
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-layout',
      'sphere',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-edge-shape',
      'arc',
    );
    await expect(page.getByTestId('showcase-layout-sphere')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByTestId('showcase-layout-force').click();

    await expect(page).toHaveURL(/showcase_layout=force/);
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-layout',
      'force',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-edge-shape',
      'line',
    );
  });

  test('sphere layout deep link loads without reload', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase&showcase_layout=sphere`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-layout',
      'sphere',
    );
    await expect(page.getByTestId('showcase-layout-sphere')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-node-count',
      '2',
    );
  });
});

test.describe('Showcase edge animation (Day 40)', () => {
  test('active edges render with animation enabled by default', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-edge-animation',
      'enabled',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-edge-active-count',
      '1',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-edge-idle-count',
      '0',
    );
  });

  test('prefers-reduced-motion disables showcase edge animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-edge-animation',
      'static',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-pulse-count',
      '0',
    );
  });

  test('external pulse bus enqueues a traveling edge pulse', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-node-count',
      '2',
    );

    await page.evaluate(() => {
      window.__OACP_ENQUEUE_SHOWCASE_EDGE_PULSE__?.({
        fromAgent: 'agent://worker',
        toAgent: 'agent://coordinator',
        messageId: 'e2e-bus-pulse',
      });
    });

    await expect
      .poll(async () =>
        page.getByTestId('showcase-graph').getAttribute('data-showcase-pulse-total'),
      )
      .toMatch(/^[1-9]\d*$/);
  });

  test('poll-based timeline growth enqueues an edge pulse', async ({ page }) => {
    let pollCount = 0;

    await seedFastReconcileInterval(page);

    await page.route('**/v1/observability/snapshot**', async (route) => {
      pollCount += 1;
      const snapshot = buildRunningE2eSnapshot(E2E_TRACE_ID);
      const timeline =
        pollCount >= 2
          ? [
              ...(snapshot.active_trace?.timeline ?? []),
              {
                index: 2,
                timestamp: '2026-06-20T00:00:30.000Z',
                type: 'task_request',
                from: 'agent://worker',
                to: 'agent://coordinator',
                capability: 'echo',
                message_id: 'msg-request-live',
                summary: 'live task_request from worker',
              },
            ]
          : (snapshot.active_trace?.timeline ?? []);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          snapshot: {
            ...snapshot,
            active_trace: {
              ...snapshot.active_trace!,
              timeline,
            },
          },
        }),
      });
    });

    await page.route('**/v1/observability/traces/*/graph', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, graph: buildE2eTraceGraph(E2E_TRACE_ID) }),
      });
    });

    await page.route('**/v1/observability/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: ': connected\n\n',
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-edge-animation',
      'enabled',
    );

    await expect
      .poll(
        async () => page.getByTestId('showcase-graph').getAttribute('data-showcase-timeline-count'),
        {
          timeout: 12_000,
        },
      )
      .toBe('3');

    await expect
      .poll(
        async () => page.getByTestId('showcase-graph').getAttribute('data-showcase-pulse-total'),
        {
          timeout: 12_000,
        },
      )
      .toMatch(/^[1-9]\d*$/);
  });
});

test.describe('Showcase post-processing bloom (Day 41)', () => {
  test('showcase mode renders bloom backdrop and default bloom settings', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-backdrop',
      'starfield-hex',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-bloom',
      'medium',
    );
    await expect(page.getByTestId('showcase-presentation-settings')).toBeVisible();
    await expect(page.getByTestId('showcase-bloom-medium')).toHaveAttribute('aria-pressed', 'true');
  });

  test('bloom intensity toggle updates URL and graph attributes', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await page.getByTestId('showcase-bloom-high').click();

    await expect(page).toHaveURL(/showcase_bloom=high/);
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute('data-showcase-bloom', 'high');
    await expect(page.getByTestId('showcase-bloom-high')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('showcase-bloom-off').click();

    await expect(page).toHaveURL(/showcase_bloom=off/);
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-bloom-effective',
      'off',
    );
  });

  test('showcase bloom deep link loads without reload', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase&showcase_bloom=low`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute('data-showcase-bloom', 'low');
    await expect(page.getByTestId('showcase-bloom-low')).toHaveAttribute('aria-pressed', 'true');
  });
});

async function mockMultiFleetGraphApi(page: import('@playwright/test').Page): Promise<void> {
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
      body: JSON.stringify({ ok: true, graph: buildMultiFleetE2eTraceGraph(E2E_TRACE_ID) }),
    });
  });
}

test.describe('Showcase fleet clustering (Day 42)', () => {
  test('multi-fleet trace renders fleet legend and two fleet clusters', async ({ page }) => {
    await mockMultiFleetGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-fleet-count',
      '2',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-fleet-filter',
      'all',
    );
    await expect(page.getByTestId('showcase-fleet-legend')).toBeVisible();
    await expect(page.getByTestId('showcase-fleet-filter-mcplab')).toBeVisible();
    await expect(page.getByTestId('showcase-fleet-filter-startup-demo')).toBeVisible();
    await expect(page.getByTestId('showcase-fleet-filter-all')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-node-count',
      '4',
    );
  });

  test('fleet filter chip updates URL and graph filter state', async ({ page }) => {
    await mockMultiFleetGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await page.getByTestId('showcase-fleet-filter-mcplab').click();

    await expect(page).toHaveURL(/showcase_fleet=mcplab/);
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-fleet-filter',
      'mcplab',
    );
    await expect(page.getByTestId('showcase-fleet-filter-mcplab')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId('showcase-fleet-filter-all')).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await page.getByTestId('showcase-fleet-filter-all').click();

    await expect(page).not.toHaveURL(/showcase_fleet=/);
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-fleet-filter',
      'all',
    );
    await expect(page.getByTestId('showcase-fleet-filter-all')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('showcase fleet filter deep link loads without reload', async ({ page }) => {
    await mockMultiFleetGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase&showcase_fleet=startup-demo`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-fleet-filter',
      'startup-demo',
    );
    await expect(page.getByTestId('showcase-fleet-filter-startup-demo')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('Showcase presentation mode (Day 43)', () => {
  test('presentation URL hides side panels and renders full-screen showcase graph', async ({
    page,
  }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase&presentation=1`);

    await expect(page.getByTestId('console-presentation-mode')).toBeVisible();
    await expect(page.getByTestId('showcase-graph')).toBeVisible();
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-presentation',
      'enabled',
    );
    await expect(page.getByTestId('showcase-presentation-exit-hint')).toBeVisible();
    await expect(page.locator('#agentsPanel')).toHaveCount(0);
    await expect(page.locator('#feedPanel')).toHaveCount(0);
  });

  test('escape exits presentation mode and restores console layout', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase&presentation=1`);

    await expect(page.getByTestId('console-presentation-mode')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page).not.toHaveURL(/presentation=1/);
    await expect(page.getByTestId('console-layout')).toBeVisible();
    await expect(page.locator('#agentsPanel')).toBeVisible();
    await expect(page.locator('#feedPanel')).toBeVisible();
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-presentation',
      'disabled',
    );
    await expect(page.locator('#graphPanel .oacp-panel__title')).toContainText('Delegation graph');
  });

  test('present button enters presentation mode from showcase toolbar', async ({ page }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-presentation-enter')).toBeVisible();
    await page.getByTestId('showcase-presentation-enter').click();

    await expect(page).toHaveURL(/presentation=1/);
    await expect(page.getByTestId('console-presentation-mode')).toBeVisible();
    await expect(page.locator('#agentsPanel')).toHaveCount(0);
  });

  test('presentation mode enables auto-rotate and hides single-fleet orbital bands until presentation', async ({
    page,
  }) => {
    await mockGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-orbital-bands',
      'hidden',
    );

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=showcase&presentation=1`);

    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-auto-rotate',
      'enabled',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-orbital-bands',
      'visible',
    );
  });

  test('presentation trace cycle advances traces on interval', async ({ page }) => {
    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot: buildE2eSnapshot(E2E_TRACE_ID) }),
      });
    });

    await page.route('**/v1/observability/traces/*/graph', async (route) => {
      const traceId = route.request().url().includes(E2E_SECOND_TRACE_ID)
        ? E2E_SECOND_TRACE_ID
        : E2E_TRACE_ID;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, graph: buildE2eTraceGraph(traceId) }),
      });
    });

    await page.goto(
      `/?trace_id=${E2E_TRACE_ID}&mode=showcase&presentation=1&presentation_cycle=1&presentation_cycle_sec=5`,
    );

    await expect(page.getByTestId('console-presentation-mode')).toHaveAttribute(
      'data-presentation-cycle',
      'enabled',
    );
    await expect(page.getByTestId('showcase-graph')).toHaveAttribute(
      'data-showcase-node-count',
      '2',
    );

    await expect
      .poll(
        async () => page.getByTestId('showcase-graph').getAttribute('data-showcase-node-count'),
        {
          timeout: 12_000,
        },
      )
      .toBe('1');
  });
});
