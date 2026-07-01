import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';
import { buildE2eTraceGraph } from './fixtures/trace-graph.js';
import { buildScaleTraceGraph } from '../src/graph/ops-graph-layout.js';

const E2E_AGENT_COORDINATOR = 'agent://coordinator';
const E2E_AGENT_WORKER = 'agent://worker';

async function mockOpsGraphApi(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/v1/observability/snapshot**', async (route) => {
    const url = new URL(route.request().url());
    const traceId = url.searchParams.get('trace_id') ?? E2E_TRACE_ID;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        snapshot: buildE2eSnapshot(traceId),
      }),
    });
  });

  await page.route('**/v1/observability/traces/*/graph', async (route) => {
    const url = new URL(route.request().url());
    const traceId = url.pathname.split('/').at(-2) ?? E2E_TRACE_ID;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        graph: buildE2eTraceGraph(traceId),
      }),
    });
  });
}

test.describe('Ops 2D graph (Day 27)', () => {
  test('renders hierarchical React Flow graph in ops mode', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph).toBeVisible();
    await expect(page.getByTestId('graph-mode-coming-soon')).toHaveCount(0);
    await expect(page.getByTestId('legacy-ring-graph')).toHaveCount(0);

    const coordinator = opsGraph.locator(`[data-agent-id="${E2E_AGENT_COORDINATOR}"]`);
    const worker = opsGraph.locator(`[data-agent-id="${E2E_AGENT_WORKER}"]`);
    await expect(coordinator).toBeVisible();
    await expect(worker).toBeVisible();

    const coordinatorBox = await coordinator.boundingBox();
    const workerBox = await worker.boundingBox();
    expect(coordinatorBox).not.toBeNull();
    expect(workerBox).not.toBeNull();
    expect(coordinatorBox!.y).toBeLessThan(workerBox!.y);
  });

  test('highlights selected agent in ops graph', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_WORKER}"]`).click();

    await expect(
      page.locator(`[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`),
    ).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('graph-selected-agent')).toContainText('Focused');
    await expect(page.getByTestId('graph-selected-agent')).toContainText('worker');
  });

  test('large trace graph keeps only trace-scoped nodes', async ({ page }) => {
    const scaleGraph = buildScaleTraceGraph(28);

    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          snapshot: buildE2eSnapshot(E2E_TRACE_ID),
        }),
      });
    });

    await page.route('**/v1/observability/traces/*/graph', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, graph: scaleGraph }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph).toBeVisible();
    await expect(opsGraph.locator('[data-agent-id]')).toHaveCount(scaleGraph.nodes.length);
    await expect(opsGraph.locator('[data-agent-id="agent://coordinator"]')).toBeVisible();
  });
});

test.describe('Ops 2D graph labels (Day 28)', () => {
  test('default view has no permanent node labels', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph).toBeVisible();
    await expect(opsGraph.locator('[data-testid^="ops-graph-pinned-label-"]')).toHaveCount(0);
    await expect(opsGraph.locator('[data-testid^="ops-graph-tooltip-"]')).toHaveCount(0);

    const nodeText = await opsGraph.locator('[data-agent-id]').allTextContents();
    expect(nodeText.every((text) => text.trim().length === 0)).toBe(true);
  });

  test('hover shows tooltip within 200ms', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const worker = page.locator(`[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`);
    await worker.hover();

    const tooltip = page.getByTestId('ops-graph-tooltip-worker');
    await expect(tooltip).toBeVisible({ timeout: 200 });
    await expect(tooltip).toContainText('Worker', { timeout: 1000 });
    await expect(tooltip).toContainText('Coder');
    await expect(tooltip).toContainText('MCPLab');
  });

  test('click pins a single label and toggles off on second click', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const worker = page.locator(`[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`);
    await worker.click();

    const pinned = page.getByTestId('ops-graph-pinned-label-worker');
    await expect(pinned).toBeVisible({ timeout: 500 });
    await expect(pinned).toContainText('Pinned');
    await expect(worker).toHaveAttribute('data-label-pinned', 'true');
    await expect(page.getByTestId('ops-graph-pinned-label-coordinator')).toHaveCount(0);

    const coordinator = page.locator(
      `[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_COORDINATOR}"]`,
    );
    await coordinator.click();
    await expect(page.getByTestId('ops-graph-pinned-label-coordinator')).toBeVisible({
      timeout: 500,
    });
    await expect(page.getByTestId('ops-graph-pinned-label-worker')).toHaveCount(0);

    await coordinator.click();
    await expect(page.getByTestId('ops-graph-pinned-label-coordinator')).toHaveCount(0);
  });

  test('pinned label survives graph refresh on same trace', async ({ page }) => {
    let graphVersion = 0;

    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          snapshot: buildE2eSnapshot(E2E_TRACE_ID),
        }),
      });
    });

    await page.route('**/v1/observability/traces/*/graph', async (route) => {
      graphVersion += 1;
      const graph = buildE2eTraceGraph(E2E_TRACE_ID);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          graph: {
            ...graph,
            nodes: graph.nodes.map((node) =>
              node.agent_id === E2E_AGENT_WORKER
                ? { ...node, name: graphVersion > 1 ? 'Worker refreshed' : node.name }
                : node,
            ),
          },
        }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const worker = page.locator(`[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`);
    await worker.click();
    await expect(page.getByTestId('ops-graph-pinned-label-worker')).toBeVisible({ timeout: 500 });

    await expect.poll(async () => graphVersion, { timeout: 5000 }).toBeGreaterThan(1);
    await expect(page.getByTestId('ops-graph-pinned-label-worker')).toBeVisible();
    await expect(page.getByTestId('ops-graph-pinned-label-worker')).toContainText(
      'Worker refreshed',
    );
    await expect(worker).toHaveAttribute('data-label-pinned', 'true');
  });
});

test.describe('Ops 2D graph edges (Day 29)', () => {
  test('renders bezier edges with arrow markers below nodes', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const edge = page.getByTestId('ops-graph-edge-coordinator-worker-0');
    await expect(edge).toHaveCount(1);
    await expect(edge).toHaveAttribute('data-edge-kind', 'subtask');

    const edgePath = edge.locator('path.react-flow__edge-path');
    await expect(edgePath).toHaveAttribute('d', /C/);
    await expect(edgePath).toHaveAttribute('marker-end', /arrowclosed/i);

    const coordinator = page.locator(
      `[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_COORDINATOR}"]`,
    );
    const worker = page.locator(`[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`);
    const edgeBox = await edgePath.boundingBox();
    const coordinatorBox = await coordinator.boundingBox();
    const workerBox = await worker.boundingBox();
    expect(edgeBox).not.toBeNull();
    expect(coordinatorBox).not.toBeNull();
    expect(workerBox).not.toBeNull();
    expect(edgeBox!.y).toBeGreaterThan(coordinatorBox!.y);
    expect(edgeBox!.y + edgeBox!.height).toBeLessThan(workerBox!.y + workerBox!.height);
  });

  test('shows edge kind legend in ops mode', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const legend = page.getByTestId('ops-graph-edge-legend');
    await expect(legend).toBeVisible();
    await expect(legend.locator('[data-edge-kind="subtask"]')).toContainText('Subtask');
  });

  test('hover edge shows capability and message count', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.getByTestId('ops-graph').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const api = (
        window as unknown as {
          __oacpTestOpsGraph?: { hoverEdge: (edgeId: string | undefined) => void };
        }
      ).__oacpTestOpsGraph;
      api?.hoverEdge('agent://coordinator:agent://worker:subtask:0');
    });

    const tooltip = page.getByTestId('ops-graph-edge-coordinator-worker-0-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 500 });
    await expect(tooltip).toContainText('echo');
    await expect(tooltip).toContainText('1 message');
  });

  test('stroke width scales with message volume', async ({ page }) => {
    const graph = buildE2eTraceGraph(E2E_TRACE_ID);
    const heavyGraph = {
      ...graph,
      edges: [
        {
          from_agent: E2E_AGENT_COORDINATOR,
          to_agent: E2E_AGENT_WORKER,
          kind: 'subtask',
          capability: 'echo',
          message_count: 12,
        },
        {
          from_agent: E2E_AGENT_WORKER,
          to_agent: E2E_AGENT_COORDINATOR,
          kind: 'responds_to',
          capability: 'echo',
          message_count: 1,
        },
      ],
    };

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
        body: JSON.stringify({ ok: true, graph: heavyGraph }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const heavy = page.getByTestId('ops-graph-edge-coordinator-worker-0');
    const light = page.getByTestId('ops-graph-edge-worker-coordinator-1');
    await expect(heavy).toHaveCount(1);
    await expect(light).toHaveCount(1);

    const heavyWidth = await heavy.locator('path.react-flow__edge-path').evaluate((path) => {
      const style = window.getComputedStyle(path);
      return Number.parseFloat(style.strokeWidth || '0');
    });
    const lightWidth = await light.locator('path.react-flow__edge-path').evaluate((path) => {
      const style = window.getComputedStyle(path);
      return Number.parseFloat(style.strokeWidth || '0');
    });
    expect(heavyWidth).toBeGreaterThan(lightWidth);
    await expect(
      page.getByTestId('ops-graph-edge-legend').locator('[data-edge-kind="responds_to"]'),
    ).toBeVisible();
  });
});

test.describe('Ops 2D graph node styling (Day 30)', () => {
  test('active nodes render larger with pulse; idle nodes are smaller and muted', async ({
    page,
  }) => {
    const graph = buildE2eTraceGraph(E2E_TRACE_ID);
    const styledGraph = {
      ...graph,
      nodes: graph.nodes.map((node) =>
        node.agent_id === E2E_AGENT_COORDINATOR
          ? { ...node, status: 'active' as const }
          : node.agent_id === E2E_AGENT_WORKER
            ? { ...node, status: 'idle' as const }
            : node,
      ),
    };

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
        body: JSON.stringify({ ok: true, graph: styledGraph }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const activeNode = page.locator(
      `[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_COORDINATOR}"]`,
    );
    const idleNode = page.locator(
      `[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`,
    );

    await expect(activeNode).toHaveAttribute('data-node-visual', 'active');
    await expect(idleNode).toHaveAttribute('data-node-visual', 'idle');

    const activeWidth = await activeNode.evaluate(
      (element) => element.getBoundingClientRect().width,
    );
    const idleWidth = await idleNode.evaluate((element) => element.getBoundingClientRect().width);
    expect(activeWidth).toBeGreaterThan(idleWidth);

    const pulseAnimation = await activeNode.evaluate(
      (element) => window.getComputedStyle(element).animationName,
    );
    expect(pulseAnimation).toContain('opsNodePulse');
  });

  test('selected agent from catalog uses distinct selection ring', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_WORKER}"]`).click();

    const selectedNode = page.locator(
      `[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`,
    );
    await expect(selectedNode).toHaveAttribute('data-selected', 'true');
    await expect(selectedNode).toHaveAttribute('data-node-visual', 'selected');

    const pulseAnimation = await selectedNode.evaluate(
      (element) => window.getComputedStyle(element).animationName,
    );
    expect(pulseAnimation).not.toContain('opsNodePulse');
  });

  test('prefers-reduced-motion disables active pulse animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const activeNode = page.locator(
      `[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_COORDINATOR}"]`,
    );
    await expect(activeNode).toHaveAttribute('data-node-visual', 'active');

    const pulseAnimation = await activeNode.evaluate(
      (element) => window.getComputedStyle(element).animationName,
    );
    expect(pulseAnimation).toBe('none');
  });
});

test.describe('Ops 2D graph viewport (Day 31)', () => {
  test('renders minimap and viewport controls', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const minimap = page.locator('[data-testid="ops-graph"] .react-flow__minimap');
    await expect(minimap).toBeVisible();
    await expect(page.getByTestId('ops-graph-viewport-controls')).toBeVisible();
    await expect(page.getByTestId('ops-graph-fit-view')).toBeVisible();
    await expect(page.getByTestId('ops-graph-reset-view')).toBeVisible();
    await expect
      .poll(async () => {
        return minimap.locator('.react-flow__minimap-node').count();
      })
      .toBe(2);
  });

  test('fit-to-view centers large trace DAG', async ({ page }) => {
    const scaleGraph = buildScaleTraceGraph(100);

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

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);
    await expect(page.getByTestId('ops-graph')).toBeVisible();
    await expect(page.locator('[data-testid="ops-graph"] [data-agent-id]')).toHaveCount(100);

    await page.getByTestId('ops-graph-fit-view').click();

    const zoomAfterFit = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __oacpTestOpsGraph?: { getViewport: () => { zoom: number } | undefined };
        }
      ).__oacpTestOpsGraph;
      return api?.getViewport()?.zoom ?? 0;
    });
    expect(zoomAfterFit).toBeGreaterThan(0);
    expect(zoomAfterFit).toBeLessThanOrEqual(2.5);
  });

  test('double-click node zooms in on that node', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const worker = page.locator(`[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`);
    const zoomBefore = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __oacpTestOpsGraph?: { getViewport: () => { zoom: number } | undefined };
        }
      ).__oacpTestOpsGraph;
      return api?.getViewport()?.zoom ?? 0;
    });

    await worker.dblclick();

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const api = (
            window as unknown as {
              __oacpTestOpsGraph?: { getViewport: () => { zoom: number } | undefined };
            }
          ).__oacpTestOpsGraph;
          return api?.getViewport()?.zoom ?? 0;
        });
      })
      .toBeGreaterThan(zoomBefore);
  });

  test('reset view restores baseline framing after manual zoom', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.getByTestId('ops-graph-fit-view').click();
    await page.waitForTimeout(300);

    const readZoom = () =>
      page.evaluate(() => {
        const api = (
          window as unknown as {
            __oacpTestOpsGraph?: { getViewport: () => { zoom: number } | undefined };
          }
        ).__oacpTestOpsGraph;
        return api?.getViewport()?.zoom ?? 0;
      });

    const baselineZoom = await readZoom();
    expect(baselineZoom).toBeGreaterThan(0.05);

    await page.evaluate((agentId) => {
      const api = (
        window as unknown as {
          __oacpTestOpsGraph?: { zoomToNode: (id: string) => void };
        }
      ).__oacpTestOpsGraph;
      api?.zoomToNode(agentId);
    }, E2E_AGENT_WORKER);
    await page.waitForTimeout(300);

    await expect.poll(readZoom, { timeout: 3000 }).not.toBeCloseTo(baselineZoom, 2);

    await page.getByTestId('ops-graph-reset-view').click();
    await page.waitForTimeout(300);

    await expect.poll(readZoom, { timeout: 3000 }).toBeCloseTo(baselineZoom, 2);
  });

  test('viewport survives manual snapshot refresh on same trace', async ({ page }) => {
    let graphVersion = 0;

    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot: buildE2eSnapshot(E2E_TRACE_ID) }),
      });
    });

    await page.route('**/v1/observability/traces/*/graph', async (route) => {
      graphVersion += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, graph: buildE2eTraceGraph(E2E_TRACE_ID) }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);
    await page.getByTestId('ops-graph').click({ position: { x: 40, y: 40 } });
    await page.mouse.wheel(0, -400);

    const zoomBeforeRefresh = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __oacpTestOpsGraph?: { getViewport: () => { zoom: number } | undefined };
        }
      ).__oacpTestOpsGraph;
      return api?.getViewport()?.zoom ?? 0;
    });

    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect.poll(async () => graphVersion, { timeout: 5000 }).toBeGreaterThan(1);

    const zoomAfterRefresh = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __oacpTestOpsGraph?: { getViewport: () => { zoom: number } | undefined };
        }
      ).__oacpTestOpsGraph;
      return api?.getViewport()?.zoom ?? 0;
    });
    expect(zoomAfterRefresh).toBeCloseTo(zoomBeforeRefresh, 2);
  });
});

test.describe('Ops 2D graph focus mode (Day 32)', () => {
  const E2E_AGENT_COORDINATOR = 'agent://coordinator';
  const E2E_AGENT_WORKER = 'agent://worker';
  const E2E_AGENT_PLANNER = 'agent://idle-planner';

  test('click node focuses neighborhood and dims non-neighbors', async ({ page }) => {
    const graph = buildE2eTraceGraph(E2E_TRACE_ID);
    const focusGraph = {
      ...graph,
      nodes: [
        ...(graph.nodes ?? []),
        {
          agent_id: E2E_AGENT_PLANNER,
          name: 'Idle planner',
          depth: 1,
          fleet: 'mcplab',
          role: 'planner',
          status: 'idle' as const,
          capabilities: ['plan'],
        },
      ],
    };

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
        body: JSON.stringify({ ok: true, graph: focusGraph }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph).toHaveAttribute('data-focus-active', 'false');

    await opsGraph.locator(`[data-agent-id="${E2E_AGENT_COORDINATOR}"]`).click();

    await expect(opsGraph).toHaveAttribute('data-focus-active', 'true');
    await expect(opsGraph.locator(`[data-agent-id="${E2E_AGENT_COORDINATOR}"]`)).toHaveAttribute(
      'data-focus-role',
      'focused',
    );
    await expect(opsGraph.locator(`[data-agent-id="${E2E_AGENT_WORKER}"]`)).toHaveAttribute(
      'data-focus-role',
      'neighbor',
    );
    await expect(opsGraph.locator(`[data-agent-id="${E2E_AGENT_PLANNER}"]`)).toHaveAttribute(
      'data-focus-role',
      'dimmed',
    );

    const dimmedOpacity = await opsGraph
      .locator(`[data-agent-id="${E2E_AGENT_PLANNER}"]`)
      .evaluate((element) => {
        const node = element.closest('.react-flow__node');
        return window.getComputedStyle(node ?? element).opacity;
      });
    expect(Number.parseFloat(dimmedOpacity)).toBeCloseTo(0.2, 1);

    const neighborOpacity = await opsGraph
      .locator(`[data-agent-id="${E2E_AGENT_WORKER}"]`)
      .evaluate((element) => {
        const node = element.closest('.react-flow__node');
        return window.getComputedStyle(node ?? element).opacity;
      });
    expect(Number.parseFloat(neighborOpacity)).toBeGreaterThan(0.9);
  });

  test('emphasizes in/out edges of focused node', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page
      .locator(`[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_COORDINATOR}"]`)
      .click();

    const focusedEdge = page.getByTestId('ops-graph-edge-coordinator-worker-0');
    const edgePath = focusedEdge.locator('path.react-flow__edge-path');
    const stroke = await edgePath.evaluate((path) => window.getComputedStyle(path).stroke);
    expect(stroke).toMatch(/rgb|#|var/i);
    const opacity = await edgePath.evaluate((path) => window.getComputedStyle(path).opacity);
    expect(Number.parseFloat(opacity)).toBeGreaterThan(0.9);
  });

  test('escape clears graph focus', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.locator(`[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`).click();
    await expect(page.getByTestId('ops-graph')).toHaveAttribute('data-focus-active', 'true');

    await page.keyboard.press('Escape');

    await expect(page.getByTestId('ops-graph')).toHaveAttribute('data-focus-active', 'false');
    await expect(page.getByTestId('graph-selected-agent')).toHaveCount(0);
  });

  test('catalog selection syncs graph focus neighborhood', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_COORDINATOR}"]`).click();

    await expect(page.getByTestId('ops-graph')).toHaveAttribute('data-focus-active', 'true');
    await expect(
      page.locator(`[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_COORDINATOR}"]`),
    ).toHaveAttribute('data-focus-role', 'focused');
    await expect(
      page.locator(`[data-testid="ops-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`),
    ).toHaveAttribute('data-focus-role', 'neighbor');
  });
});
