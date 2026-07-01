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

test.describe('Fleet grouping (Day 17)', () => {
  test('groups trace agents under MCPLab fleet header', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const mcplabSection = page.getByTestId('fleet-section-mcplab');
    await expect(mcplabSection).toBeVisible();
    await expect(page.getByTestId('fleet-count-mcplab')).toHaveText('2');
    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toBeVisible();
    await expect(page.locator('button[data-agent-id="agent://worker"]')).toBeVisible();
    await expect(page.getByTestId('fleet-section-startup-demo')).toHaveCount(0);
  });

  test('show all registered reveals separate fleet sections', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId('agents-show-all-toggle').check();

    await expect(page.getByTestId('fleet-section-mcplab')).toBeVisible();
    await expect(page.getByTestId('fleet-count-mcplab')).toHaveText('4');
    await expect(page.getByTestId('fleet-section-startup-demo')).toBeVisible();
    await expect(page.getByTestId('fleet-count-startup-demo')).toHaveText('2');
    await expect(page.getByTestId('fleet-section-external')).toBeVisible();
    await expect(page.getByTestId('fleet-count-external')).toHaveText('1');

    await expect(page.getByText('Startup PM', { exact: true })).toBeVisible();
    await expect(page.getByText('Orphan Agent', { exact: true })).toBeVisible();
  });

  test('collapses and expands a fleet section', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const header = page.getByTestId('fleet-header-mcplab');
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toBeVisible();

    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toHaveCount(0);

    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toBeVisible();
  });

  test('applies fleet color ring on agent cards', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId('agents-show-all-toggle').check();

    await expect(
      page.locator('[data-fleet-bucket="mcplab"] button[data-agent-id="agent://coordinator"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-fleet-bucket="startup-demo"] button[data-agent-id="agent://startup-pm"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-fleet-bucket="external"] button[data-agent-id="agent://orphan-agent"]'),
    ).toBeVisible();
  });
});
