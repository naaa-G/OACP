import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';
import { SEARCH_DEBOUNCE_MS } from '../src/utils/agent-search.js';

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

test.describe('Agent search (Day 19)', () => {
  test('focuses search with / keyboard shortcut', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const search = page.getByTestId('agents-search-input');
    await page.locator('#graphPanel').click();
    await page.keyboard.press('/');
    await expect(search).toBeFocused();
  });

  test('returns coder roles across fleets with fuzzy search', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId('agents-show-all-toggle').check();
    await page.getByTestId('agents-search-input').fill('coder');
    await waitForSearchDebounce(page);

    await expect(page.locator('button[data-agent-id="agent://worker"]')).toBeVisible();
    await expect(page.locator('button[data-agent-id="agent://startup-coder"]')).toBeVisible();
    await expect(page.locator('button[data-agent-id="agent://orphan-agent"]')).toBeVisible();
    await expect(page.locator('button[data-agent-id="agent://idle-planner"]')).toHaveCount(0);
  });

  test('highlights matching substrings in agent cards', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId('agents-search-input').fill('Worker');
    await waitForSearchDebounce(page);

    const highlight = page.locator('button[data-agent-id="agent://worker"] mark').first();
    await expect(highlight).toHaveText('Worker');
  });

  test('clears search with clear button', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const search = page.getByTestId('agents-search-input');
    await search.fill('worker');
    await waitForSearchDebounce(page);
    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear search' }).click();
    await waitForSearchDebounce(page);
    await expect(search).toHaveValue('');
    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toBeVisible();
  });

  test('shows no-results empty state', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId('agents-search-input').fill('zzznomatch');
    await waitForSearchDebounce(page);

    await expect(page.getByTestId('agents-search-empty')).toBeVisible();
    await expect(page.getByTestId('agents-search-empty')).toContainText('No agents match');
  });
});
