import { expect, test } from '@playwright/test';

import { buildLargeE2eSnapshot } from './fixtures/large-snapshot.js';
import { E2E_TRACE_ID } from './fixtures/snapshot.js';

const DENSITY_STORAGE_KEY = 'oacp.console.agentDensity.v1';

async function mockLargeSnapshotApi(
  page: import('@playwright/test').Page,
  bulkCount: number = 100,
): Promise<void> {
  await page.route('**/v1/observability/snapshot**', async (route) => {
    const url = new URL(route.request().url());
    const traceId = url.searchParams.get('trace_id') ?? E2E_TRACE_ID;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        snapshot: buildLargeE2eSnapshot(bulkCount, traceId),
      }),
    });
  });
}

async function clearDensityPreference(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);
  await page.evaluate((key) => {
    window.sessionStorage.removeItem(key);
  }, DENSITY_STORAGE_KEY);
  await page.reload();
}

async function countVisibleAgentCards(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll<HTMLElement>('#agentsPanel button[data-agent-id]'),
    );
    const viewportHeight = window.innerHeight;

    return buttons.filter((button) => {
      const rect = button.getBoundingClientRect();
      return rect.top < viewportHeight && rect.bottom > 0;
    }).length;
  });
}

test.describe('Virtualized agent list (Day 23)', () => {
  test.beforeEach(async ({ page }) => {
    await mockLargeSnapshotApi(page);
    await clearDensityPreference(page);
  });

  test('virtual list retains usable scroll height in trace-scoped view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const clientHeight = await page.getByTestId('agents-virtual-list').evaluate((element) => {
      return element.clientHeight;
    });

    expect(clientHeight).toBeGreaterThan(120);
  });

  test('virtualizes 100+ agents and keeps DOM subset mounted', async ({ page }) => {
    await page.getByTestId('agents-show-all-toggle').check();

    const virtualList = page.getByTestId('agents-virtual-list');
    await expect(virtualList.locator('[data-virtual-row-count]')).toHaveAttribute(
      'data-virtual-row-count',
      /^(1[0-9]{2}|[2-9][0-9])$/,
    );

    const rowCount = await page
      .locator('[data-testid="agents-virtual-list"] [data-virtual-row-count]')
      .getAttribute('data-virtual-row-count');
    const mountedCards = await page.locator('#agentsPanel button[data-agent-id]').count();
    expect(mountedCards).toBeLessThan(Number(rowCount));

    await virtualList.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.waitForTimeout(150);
    await expect(
      page.locator('button[data-agent-id^="agent://bulk-agent-"]').first(),
    ).toBeVisible();
  });

  test('compact density fits at least twice as many visible agents as detailed', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByTestId('agents-show-all-toggle').check();

    const detailedVisible = await countVisibleAgentCards(page);
    expect(detailedVisible).toBeGreaterThan(0);

    await page.getByTestId('agents-density-compact').click();
    await expect(page.getByTestId('agents-virtual-list')).toHaveAttribute(
      'data-density',
      'compact',
    );

    const compactVisible = await countVisibleAgentCards(page);
    expect(compactVisible).toBeGreaterThanOrEqual(detailedVisible * 2);
  });

  test('compact mode shows role and short id without capability pills', async ({ page }) => {
    await page.getByTestId('agents-density-compact').click();

    const worker = page.locator('[data-density="compact"] button[data-agent-id="agent://worker"]');
    await expect(worker).toBeVisible();
    await expect(worker.getByTestId('agent-role-badge')).toBeVisible();
    await expect(worker).toContainText('worker');
    await expect(worker.locator('[aria-label="Capabilities"]')).toHaveCount(0);
  });

  test('detailed mode shows full URI and capabilities', async ({ page }) => {
    await page.getByTestId('agents-density-detailed').click();

    const worker = page.locator('[data-density="detailed"] button[data-agent-id="agent://worker"]');
    await expect(worker).toBeVisible();
    await expect(worker).toContainText('agent://worker');
    await expect(worker.locator('[aria-label="Capabilities"]')).toBeVisible();
  });

  test('persists density preference across reload', async ({ page }) => {
    await page.getByTestId('agents-density-compact').click();
    await expect(page.getByTestId('agents-density-compact')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.reload();
    await expect(page.getByTestId('agents-virtual-list')).toHaveAttribute(
      'data-density',
      'compact',
    );
    await expect(page.getByTestId('agents-density-compact')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
