import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';

const E2E_AGENT_WORKER = 'agent://worker';
const E2E_AGENT_PLANNER = 'agent://idle-planner';
const E2E_AGENT_SHORT_WORKER = 'worker';
const E2E_AGENT_SHORT_PLANNER = 'idle-planner';

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

/**
 * Day 25 — consolidated acceptance for Issue #1 (agent catalog Weeks 4–5).
 * Complements focused specs under e2e/console-agent-*.spec.ts.
 */
test.describe('Agent catalog suite (Day 25)', () => {
  test('golden path: trace scope → fleet → filter/search → select → cross-panel highlight', async ({
    page,
  }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const workerCard = page.locator(`button[data-agent-id="${E2E_AGENT_WORKER}"]`);
    const coordinatorCard = page.locator('button[data-agent-id="agent://coordinator"]');
    await expect(workerCard).toBeVisible();
    await expect(coordinatorCard).toBeVisible();
    await expect(page.locator(`button[data-agent-id="${E2E_AGENT_PLANNER}"]`)).toHaveCount(0);

    await page.getByTestId('agents-show-all-toggle').check();
    await expect(page.getByTestId('fleet-section-mcplab')).toBeVisible();
    await expect(page.getByTestId('fleet-section-startup-demo')).toBeVisible();
    await expect(page.locator(`button[data-agent-id="${E2E_AGENT_PLANNER}"]`)).toBeVisible();

    await page.getByTestId('filter-fleet-mcplab').click();
    await page.getByTestId('agents-search-input').fill('planner');
    await expect(page.locator(`button[data-agent-id="${E2E_AGENT_PLANNER}"]`)).toHaveCount(1);
    await expect(page.locator(`button[data-agent-id="${E2E_AGENT_WORKER}"]`)).toHaveCount(0);

    await page.getByTestId('agents-clear-filters').click();
    await page.getByTestId('agents-search-input').fill('');

    await workerCard.click();
    await expect(
      page.locator(`[data-testid="legacy-ring-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`),
    ).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('feed-agent-filter-bar')).toContainText('Worker');
    await expect(page).toHaveURL(new RegExp(`agent=${encodeURIComponent(E2E_AGENT_WORKER)}`));

    await page.getByTestId('header-clear-selection').click();
    await expect(page.getByTestId('feed-agent-filter-bar')).toHaveCount(0);
  });

  test('row action links graph and feed without opening detail drawer', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId(`agent-actions-${E2E_AGENT_SHORT_WORKER}`).click();
    await page.getByTestId(`agent-action-focus-graph-${E2E_AGENT_SHORT_WORKER}`).click();

    await expect(page.getByTestId('agent-detail-drawer')).toHaveCount(0);
    await expect(
      page.locator(`[data-testid="legacy-ring-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`),
    ).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('feed-agent-filter-bar')).toContainText('Worker');
  });

  test('distinguishes coder agents by fleet bucket on cards', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);
    await page.getByTestId('agents-show-all-toggle').check();

    const mcplabCoder = page.locator(
      '[data-fleet-bucket="mcplab"][data-role-id="coder"] button[data-agent-id="agent://worker"]',
    );
    const startupCoder = page.locator(
      '[data-fleet-bucket="startup-demo"][data-role-id="coder"] button[data-agent-id="agent://startup-coder"]',
    );

    await expect(mcplabCoder).toBeVisible();
    await expect(startupCoder).toBeVisible();
    await expect(mcplabCoder.getByTestId('agent-role-badge')).toContainText('Coder');
    await expect(startupCoder.getByTestId('agent-role-badge')).toContainText('Coder');
  });

  test('pin planner persists and stays above fleet list after reload', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);
    await page.getByTestId('agents-show-all-toggle').check();

    const plannerActions = page.getByTestId(`agent-actions-${E2E_AGENT_SHORT_PLANNER}`);
    await plannerActions.scrollIntoViewIfNeeded();
    await plannerActions.click();
    await page.getByTestId(`agent-action-pin-${E2E_AGENT_SHORT_PLANNER}`).click();

    await expect(page.getByTestId('pinned-section-header')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('pinned-section-header')).toBeVisible();
    await expect(
      page
        .locator('[data-pinned="true"]')
        .first()
        .locator(`button[data-agent-id="${E2E_AGENT_PLANNER}"]`),
    ).toBeVisible();
  });
});
