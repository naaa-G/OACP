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

test.describe('Role taxonomy (Day 18)', () => {
  test('shows role icon and label on agent cards', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const coordinatorCard = page.locator(
      'button[data-agent-id="agent://coordinator"] [data-testid="agent-role-badge"]',
    );
    await expect(coordinatorCard).toContainText('Coordinator');
    await expect(coordinatorCard).toHaveAttribute('data-role-id', 'coordinator');

    const workerCard = page.locator(
      'button[data-agent-id="agent://worker"] [data-testid="agent-role-badge"]',
    );
    await expect(workerCard).toContainText('Coder');
  });

  test('distinguishes two coder agents by fleet and uri', async ({ page }) => {
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

  test('infers role from capability when metadata is missing', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId('agents-show-all-toggle').check();

    const orphanBadge = page.locator(
      'button[data-agent-id="agent://orphan-agent"] [data-testid="agent-role-badge"]',
    );
    await expect(orphanBadge).toContainText('Coder');
    await expect(orphanBadge).toHaveAttribute('data-role-source', 'capability');
  });

  test('renders role legend for visible agents', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const legend = page.getByTestId('agents-role-legend');
    await expect(legend).toBeVisible();
    await expect(legend.getByText('Coordinator')).toBeVisible();
    await expect(legend.getByText('Coder')).toBeVisible();
  });

  test('search matches resolved role labels', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId('agents-search-input').fill('planner');
    await page.waitForTimeout(200);
    await expect(page.getByText('Idle Planner', { exact: true })).toHaveCount(0);

    await page.getByTestId('agents-show-all-toggle').check();
    await page.waitForTimeout(200);
    await expect(page.getByText('Idle Planner', { exact: true })).toBeVisible();
  });
});
