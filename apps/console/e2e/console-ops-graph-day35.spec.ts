import { expect, test } from '@playwright/test';

import {
  buildMcplabE2eSnapshot,
  buildMcplabE2eTraceGraph,
  MCPLAB_AGENTS,
  MCPLAB_E2E_TRACE_ID,
} from './fixtures/mcplab-ops-graph.js';
import { buildScaleTraceGraph } from '../src/graph/ops-graph-layout.js';

async function mockMcplabOpsApi(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/v1/observability/snapshot**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, snapshot: buildMcplabE2eSnapshot() }),
    });
  });

  await page.route('**/v1/observability/traces/*/graph', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, graph: buildMcplabE2eTraceGraph() }),
    });
  });
}

async function mockScaleOpsApi(
  page: import('@playwright/test').Page,
  agentCount: number,
): Promise<void> {
  const graph = buildScaleTraceGraph(agentCount);
  const traceId = graph.trace_id;

  await page.route('**/v1/observability/snapshot**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        snapshot: {
          server: {
            status: 'healthy',
            protocol_version: '1.0',
            registered_agents: agentCount,
            bus_open: true,
          },
          agents: graph.nodes.map((node) => ({
            id: node.agent_id,
            name: node.name,
            version: '1.0',
            capabilities: [...node.capabilities],
            publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'scale' },
            status: node.status,
            fleet: node.fleet,
            role: node.role,
          })),
          traces: [
            {
              traceId,
              startedAt: '2026-06-20T00:00:00.000Z',
              lastActivityAt: '2026-06-20T00:01:00.000Z',
              messageCount: graph.edges.length,
              messageTypes: ['task_request'],
              agents: graph.nodes.map((node) => node.agent_id),
            },
          ],
          trace_count: 1,
          active_trace: {
            trace_id: traceId,
            started_at: '2026-06-20T00:00:00.000Z',
            last_activity_at: '2026-06-20T00:01:00.000Z',
            message_count: graph.edges.length,
            message_types: ['task_request'],
            agents: graph.nodes.map((node) => node.agent_id),
            timeline: [],
          },
          agent_links: graph.edges.map((edge) => ({
            from_agent: edge.from_agent,
            to_agent: edge.to_agent,
            kind: edge.kind,
            message_count: edge.message_count,
          })),
        },
      }),
    });
  });

  await page.route('**/v1/observability/traces/*/graph', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, graph }),
    });
  });
}

test.describe('Ops 2D graph polish + sign-off (Day 35)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('renders MCPLab crew trace in ops mode', async ({ page }) => {
    await mockMcplabOpsApi(page);
    await page.goto(`/?trace_id=${MCPLAB_E2E_TRACE_ID}&mode=ops`);

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph).toBeVisible();

    for (const agent of MCPLAB_AGENTS) {
      await expect(opsGraph.locator(`[data-agent-id="${agent.id}"]`)).toBeVisible();
    }

    await expect(page.getByTestId('graph-mode-label')).toContainText('Ops 2D');
  });

  test('legend shows idle, active, selected, and edge kinds', async ({ page }) => {
    await mockMcplabOpsApi(page);
    await page.goto(`/?trace_id=${MCPLAB_E2E_TRACE_ID}&mode=ops`);

    await expect(page.getByTestId('ops-graph-legend')).toBeVisible();
    await expect(page.getByTestId('ops-graph-legend-idle')).toBeVisible();
    await expect(page.getByTestId('ops-graph-legend-active')).toBeVisible();
    await expect(page.getByTestId('ops-graph-legend-selected')).toBeVisible();
    await expect(page.getByTestId('ops-graph-edge-legend')).toBeVisible();
    await expect(page.getByTestId('ops-graph-legend-edge-subtask')).toContainText('Subtask');
  });

  test('MCPLab trace supports wheel zoom after fit-to-view', async ({ page }) => {
    await mockMcplabOpsApi(page);
    await page.goto(`/?trace_id=${MCPLAB_E2E_TRACE_ID}&mode=ops`);

    await page.getByTestId('ops-graph-fit-view').click();
    await page.waitForTimeout(200);

    const zoomBefore = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __oacpTestOpsGraph?: { getViewport: () => { zoom: number } | undefined };
        }
      ).__oacpTestOpsGraph;
      return api?.getViewport()?.zoom ?? 0;
    });

    await page.getByTestId('ops-graph').click({ position: { x: 200, y: 200 } });
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(150);

    const zoomAfter = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __oacpTestOpsGraph?: { getViewport: () => { zoom: number } | undefined };
        }
      ).__oacpTestOpsGraph;
      return api?.getViewport()?.zoom ?? 0;
    });

    expect(zoomAfter).toBeGreaterThan(zoomBefore);
  });

  test('30-agent ops graph matches visual regression baseline', async ({ page }) => {
    await mockScaleOpsApi(page, 30);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/?trace_id=scale-test-trace&mode=ops`);

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph).toBeVisible();
    await page.getByTestId('ops-graph-fit-view').click();
    await expect(opsGraph.locator('[data-agent-id]').first()).toBeVisible();

    const viewport = opsGraph.locator('.react-flow__viewport');
    await expect(viewport).toBeVisible();
    await expect
      .poll(async () => viewport.boundingBox())
      .toMatchObject({ width: expect.any(Number), height: expect.any(Number) });

    await expect(viewport).toHaveScreenshot('ops-graph-30-agent.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
      mask: [opsGraph.locator('.react-flow__minimap')],
    });
  });
});
