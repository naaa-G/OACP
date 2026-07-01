import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';
import { SEARCH_DEBOUNCE_MS } from '../src/utils/agent-search.js';

const CATALOG_FILTERS_KEY = 'oacp.console.catalogFilters.v1';

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

async function waitForSearchDebounce(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS + 40);
}

async function clearCatalogFilters(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate((key) => {
    window.sessionStorage.removeItem(key);
  }, CATALOG_FILTERS_KEY);
}

async function openConsole(
  page: import('@playwright/test').Page,
  options?: { readonly resetFilters?: boolean },
): Promise<void> {
  await mockSnapshotApi(page);
  await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);
  if (options?.resetFilters !== false) {
    await clearCatalogFilters(page);
    await page.reload();
  }
}

test.describe('Agent catalog filters (Day 20)', () => {
  test('filters fleet=mcplab and search planner to a single planner agent', async ({ page }) => {
    await openConsole(page);

    await page.getByTestId('agents-show-all-toggle').check();
    await page.getByTestId('filter-fleet-mcplab').click();
    await page.getByTestId('agents-search-input').fill('planner');
    await waitForSearchDebounce(page);

    await expect(page.locator('button[data-agent-id="agent://idle-planner"]')).toBeVisible();
    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toHaveCount(0);
    await expect(page.locator('button[data-agent-id="agent://worker"]')).toHaveCount(0);
    await expect(page.locator('button[data-agent-id="agent://idle-researcher"]')).toHaveCount(0);
  });

  test('persists filter state across page refresh in sessionStorage', async ({ page }) => {
    await openConsole(page);

    await page.getByTestId('filter-fleet-mcplab').click();
    await expect(page.getByTestId('filter-fleet-mcplab')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();

    await expect(page.getByTestId('filter-fleet-mcplab')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('agents-catalog-toolbar')).toBeVisible();
  });

  test('shows empty state when filters exclude all visible agents', async ({ page }) => {
    await openConsole(page);

    await page.getByTestId('filter-status-idle').click();

    await expect(page.getByTestId('agents-search-empty')).toBeVisible();
    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toHaveCount(0);
  });

  test('clears filters with clear button', async ({ page }) => {
    await openConsole(page);

    await page.getByTestId('filter-fleet-mcplab').click();
    await page.getByTestId('agents-clear-filters').click();

    await expect(page.getByTestId('filter-fleet-mcplab')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toBeVisible();
  });
});
