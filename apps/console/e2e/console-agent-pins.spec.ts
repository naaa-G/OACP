import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';
import { PINNED_AGENTS_STORAGE_KEY } from '../src/utils/pinned-agents.js';

const E2E_AGENT_PLANNER = 'agent://idle-planner';
const E2E_AGENT_WORKER = 'agent://worker';
const E2E_AGENT_SHORT_PLANNER = 'idle-planner';
const E2E_AGENT_SHORT_WORKER = 'worker';

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

test.describe('Agent pins + row actions (Day 24)', () => {
  test('pins planner to the top and persists in localStorage', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);
    await page.evaluate((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, PINNED_AGENTS_STORAGE_KEY);
    await page.reload();
    await page.getByTestId('agents-show-all-toggle').check();

    const plannerActions = page.getByTestId(`agent-actions-${E2E_AGENT_SHORT_PLANNER}`);
    await plannerActions.scrollIntoViewIfNeeded();
    await plannerActions.click();
    await page.getByTestId(`agent-action-pin-${E2E_AGENT_SHORT_PLANNER}`).click();

    await expect(page.getByTestId('pinned-section-header')).toBeVisible();
    await expect(page.getByTestId('pinned-section-count')).toHaveText('1');

    const pinnedCard = page.locator('[data-pinned="true"]').first();
    await expect(pinnedCard.locator(`button[data-agent-id="${E2E_AGENT_PLANNER}"]`)).toBeVisible();

    const stored = await page.evaluate((storageKey) => {
      return window.localStorage.getItem(storageKey);
    }, PINNED_AGENTS_STORAGE_KEY);
    expect(stored).toContain(E2E_AGENT_PLANNER);

    await page.reload();
    await expect(page.getByTestId('pinned-section-header')).toBeVisible();
    await expect(
      page
        .locator('[data-pinned="true"]')
        .first()
        .locator(`button[data-agent-id="${E2E_AGENT_PLANNER}"]`),
    ).toBeVisible();
  });

  test('copy URI writes agent id to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId(`agent-actions-${E2E_AGENT_SHORT_WORKER}`).click();
    await page.getByTestId(`agent-action-copy-uri-${E2E_AGENT_SHORT_WORKER}`).click();

    await expect
      .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(E2E_AGENT_WORKER);
  });

  test('filter feed row action links panels without opening the drawer', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId(`agent-actions-${E2E_AGENT_SHORT_WORKER}`).click();
    await page.getByTestId(`agent-action-filter-feed-${E2E_AGENT_SHORT_WORKER}`).click();

    await expect(page.getByTestId('feed-agent-filter-bar')).toContainText('Worker');
    await expect(page.getByTestId('agent-detail-drawer')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`agent=${encodeURIComponent(E2E_AGENT_WORKER)}`));
  });

  test('focus in graph row action selects agent for cross-panel highlight', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId(`agent-actions-${E2E_AGENT_SHORT_WORKER}`).click();
    await page.getByTestId(`agent-action-focus-graph-${E2E_AGENT_SHORT_WORKER}`).click();

    const graphNode = page.locator(
      `[data-testid="legacy-ring-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`,
    );
    await expect(graphNode).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('agent-detail-drawer')).toHaveCount(0);
  });
});
