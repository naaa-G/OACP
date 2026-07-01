import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';

const E2E_AGENT_WORKER = 'agent://worker';
const E2E_AGENT_PLANNER = 'agent://idle-planner';

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

test.describe('Cross-panel linking (Day 22)', () => {
  test('highlights selected agent in graph and filters message feed', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const feed = page.getByLabel('Message timeline');
    await expect(feed.locator('[data-message-id="msg-request-1"]')).toBeVisible();
    await expect(feed.locator('[data-message-id="msg-response-1"]')).toBeVisible();

    await page.locator(`button[data-agent-id="${E2E_AGENT_WORKER}"]`).click();

    const graphNode = page.locator(
      `[data-testid="legacy-ring-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`,
    );
    await expect(graphNode).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('graph-selected-agent')).toContainText('worker');
    await expect(page.getByTestId('feed-agent-filter-bar')).toContainText('Worker');
    await expect(feed.locator('[data-message-id="msg-request-1"]')).toBeVisible();
    await expect(feed.locator('[data-message-id="msg-response-1"]')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`agent=${encodeURIComponent(E2E_AGENT_WORKER)}`));
  });

  test('MCPLab planner selection highlights graph and scopes feed', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId('agents-show-all-toggle').check();
    await page.locator(`button[data-agent-id="${E2E_AGENT_PLANNER}"]`).click();

    const graphNode = page.locator(
      `[data-testid="legacy-ring-graph"] [data-agent-id="${E2E_AGENT_PLANNER}"]`,
    );
    await expect(graphNode).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('feed-agent-filter-bar')).toContainText('Idle Planner');
    await expect(page.getByTestId('feed-agent-filter-empty')).toBeVisible();
  });

  test('clear selection in header restores full message feed', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_WORKER}"]`).click();
    await expect(page.getByTestId('feed-agent-filter-bar')).toBeVisible();
    await expect(page.getByTestId('header-clear-selection')).toBeVisible();

    await page.getByTestId('header-clear-selection').click();

    await expect(page.getByTestId('feed-agent-filter-bar')).toHaveCount(0);
    await expect(page.getByTestId('header-clear-selection')).toHaveCount(0);
    await expect(page).not.toHaveURL(/agent=/);
    await expect(
      page.getByLabel('Message timeline').locator('[data-message-id="msg-request-1"]'),
    ).toBeVisible();
    await expect(
      page.locator(`[data-testid="legacy-ring-graph"] [data-agent-id="${E2E_AGENT_WORKER}"]`),
    ).toHaveAttribute('data-selected', 'false');
  });

  test('highlights delegation edges touching the selected agent', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_WORKER}"]`).click();

    const selectedEdge = page.locator(
      '[data-testid="legacy-ring-graph"] line[data-touches-selection="true"]',
    );
    await expect(selectedEdge).toHaveCount(1);
  });
});
