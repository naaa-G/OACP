import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';
import { buildE2eTraceGraph } from './fixtures/trace-graph.js';

const E2E_AGENT_COORDINATOR = 'agent://coordinator';
const E2E_AGENT_WORKER = 'agent://worker';
const E2E_AGENT_PLANNER = 'agent://idle-planner';
const E2E_IDLE_AGENT_COUNT = 5;

async function mockOpsGraphApi(page: import('@playwright/test').Page): Promise<void> {
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

test.describe('Ops 2D registry ghost nodes (Day 34)', () => {
  test('defaults to trace-scoped graph without ghost nodes', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph.locator(`[data-agent-id="${E2E_AGENT_COORDINATOR}"]`)).toBeVisible();
    await expect(opsGraph.locator(`[data-agent-id="${E2E_AGENT_WORKER}"]`)).toBeVisible();
    await expect(opsGraph.locator('[data-ghost="true"]')).toHaveCount(0);
    await expect(opsGraph).toHaveAttribute('data-registry-expanded', 'false');
  });

  test('show full registry toggle adds orbital ghost nodes', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.getByTestId('ops-graph-show-all-toggle').click();

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph).toHaveAttribute('data-registry-expanded', 'true');
    await expect(opsGraph.locator('[data-ghost="true"]')).toHaveCount(E2E_IDLE_AGENT_COUNT);
    await expect(opsGraph.locator(`[data-agent-id="${E2E_AGENT_PLANNER}"]`)).toHaveAttribute(
      'data-node-visual',
      'ghost',
    );
    await expect(opsGraph.locator(`[data-agent-id="${E2E_AGENT_COORDINATOR}"]`)).toHaveAttribute(
      'data-node-visual',
      'active',
    );
  });

  test('shows idle agent warning badge when registry expanded', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.getByTestId('ops-graph-show-all-toggle').click();

    await expect(page.getByTestId('ops-graph-ghost-badge')).toHaveText(
      `+${E2E_IDLE_AGENT_COUNT} idle agents`,
    );
    await expect(page.getByTestId('ops-graph-ghost-legend')).toBeVisible();
  });

  test('catalog and graph toggles stay in sync', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.getByTestId('agents-show-all-toggle').click();

    await expect(page.getByTestId('ops-graph-show-all-toggle')).toBeChecked();
    await expect(page.getByTestId('ops-graph')).toHaveAttribute('data-registry-expanded', 'true');
  });

  test('ghost nodes remain outside trace hierarchy readability', async ({ page }) => {
    await mockOpsGraphApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=ops`);

    await page.getByTestId('ops-graph-show-all-toggle').click();

    const coordinator = page
      .getByTestId('ops-graph')
      .locator(`[data-agent-id="${E2E_AGENT_COORDINATOR}"]`);
    const worker = page.getByTestId('ops-graph').locator(`[data-agent-id="${E2E_AGENT_WORKER}"]`);
    const planner = page.getByTestId('ops-graph').locator(`[data-agent-id="${E2E_AGENT_PLANNER}"]`);

    const coordinatorBox = await coordinator.boundingBox();
    const workerBox = await worker.boundingBox();
    const plannerBox = await planner.boundingBox();

    expect(coordinatorBox).not.toBeNull();
    expect(workerBox).not.toBeNull();
    expect(plannerBox).not.toBeNull();

    const traceCenterY = (coordinatorBox!.y + workerBox!.y) / 2;
    const ghostDistance = Math.abs(plannerBox!.y - traceCenterY);
    expect(ghostDistance).toBeGreaterThan(40);
  });
});
