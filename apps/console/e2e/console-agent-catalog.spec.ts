import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';

async function mockSnapshotApi(page: import('@playwright/test').Page): Promise<void> {
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
}

test.describe('Agent catalog trace scope (Day 16)', () => {
  test('defaults to agents in the selected trace', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await expect(page.getByTestId('agents-scope-count')).toContainText('2 of 7 agents');
    await expect(page.getByTestId('agents-scope-count')).toContainText('In current trace');

    const agentList = page.getByRole('list', { name: 'Agent list grouped by fleet' });
    await expect(agentList.locator('button[data-agent-id="agent://coordinator"]')).toBeVisible();
    await expect(agentList.locator('button[data-agent-id="agent://worker"]')).toBeVisible();
    await expect(agentList.getByText('Idle Planner', { exact: true })).toHaveCount(0);
    await expect(agentList.getByText('Idle Researcher', { exact: true })).toHaveCount(0);
  });

  test('show all registered reveals dimmed out-of-trace agents', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const graph = page.getByTestId('legacy-ring-graph');
    const graphPanel = page.locator('#graphPanel');
    const initialPanelHeight = (await graphPanel.boundingBox())?.height ?? 0;
    expect(initialPanelHeight).toBeGreaterThan(0);

    await expect(graph.locator('g[data-agent-id]')).toHaveCount(2);

    await page.getByTestId('agents-show-all-toggle').check();

    await expect(page.getByTestId('agents-scope-count')).toContainText('7 agents');
    await expect(graph.locator('g[data-agent-id]')).toHaveCount(7);
    await expect(page.getByText('Idle Planner', { exact: true })).toBeVisible();
    await expect(page.getByText('Idle Researcher', { exact: true })).toBeVisible();

    await expect(
      page.locator('button[data-agent-id="agent://idle-planner"][data-out-of-trace="true"]'),
    ).toBeVisible();
    await expect(
      page.locator('button[data-agent-id="agent://coordinator"][data-out-of-trace="false"]'),
    ).toBeVisible();

    await page.getByTestId('agents-show-all-toggle').uncheck();
    await expect(graph.locator('g[data-agent-id]')).toHaveCount(2);

    const finalPanelHeight = (await graphPanel.boundingBox())?.height ?? 0;
    expect(finalPanelHeight).toBeGreaterThan(0);
    expect(Math.abs(finalPanelHeight - initialPanelHeight)).toBeLessThan(2);
  });

  test('resets to trace scope when switching traces', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId('agents-show-all-toggle').check();
    await expect(page.getByText('Idle Planner', { exact: true })).toBeVisible();

    const secondTrace = page.getByRole('button', {
      name: new RegExp('1a2b3c4d'),
    });
    await secondTrace.click();

    await expect(page.getByTestId('agents-show-all-toggle')).not.toBeChecked();
    await expect(page.getByTestId('agents-scope-count')).toContainText('1 of 7 agents');
    await expect(page.getByText('Idle Planner', { exact: true })).toHaveCount(0);
  });
});
