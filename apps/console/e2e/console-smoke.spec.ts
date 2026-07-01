import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_SECOND_TRACE_ID, E2E_TRACE_ID } from './fixtures/snapshot.js';

const E2E_AGENT_COORDINATOR = 'agent://coordinator';

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

test.describe('Console smoke (Day 10)', () => {
  test('loads layout, selects trace, and shows message feed', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'OACP Console' })).toBeVisible();
    await expect(page.getByText('Connected')).toBeVisible();

    await expect(page.getByLabel('Registered agents')).toBeVisible();

    const agentList = page.getByRole('list', { name: 'Agent list grouped by fleet' });
    const coordinatorCard = agentList.locator('button[data-agent-id="agent://coordinator"]');
    await expect(coordinatorCard).toBeVisible();
    const workerCard = agentList.locator('button[data-agent-id="agent://worker"]');
    await expect(workerCard).toBeVisible();
    await expect(workerCard.getByText('mcplab', { exact: true })).toBeVisible();
    await expect(workerCard.getByTestId('agent-role-badge')).toContainText('Coder');

    await expect(page.getByTestId('legacy-ring-graph')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Delegation graph' })).toBeVisible();

    const feed = page.getByLabel('Message timeline');
    await expect(feed).toBeVisible();
    await expect(feed.getByText('task_request from coordinator')).toBeVisible();
    await expect(feed.getByText('task_response (success)')).toBeVisible();

    const successItem = feed.locator('[data-message-id="msg-response-1"]');
    await expect(successItem).toHaveClass(/success/);
  });

  test('trace rail selection updates URL and feed context', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}`);

    await expect(page).toHaveURL(new RegExp(`trace_id=${E2E_TRACE_ID}`));

    const secondTrace = page.getByRole('button', {
      name: new RegExp(E2E_SECOND_TRACE_ID),
    });
    await secondTrace.click();

    await expect(page).toHaveURL(new RegExp(`trace_id=${E2E_SECOND_TRACE_ID}`));
    await expect(page.getByLabel('Message timeline')).toBeVisible();
  });
});

test.describe('Console selection (Day 13)', () => {
  test('agent click updates URL and survives poll refresh', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const coordinator = page.locator(`button[data-agent-id="${E2E_AGENT_COORDINATOR}"]`);
    await coordinator.click();

    await expect(coordinator).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(new RegExp(`agent=${encodeURIComponent(E2E_AGENT_COORDINATOR)}`));

    // Simulate live poll — selection must persist across refetch.
    await page.waitForTimeout(1600);
    await expect(coordinator).toHaveAttribute('aria-pressed', 'true');

    await coordinator.click();
    await expect(coordinator).toHaveAttribute('aria-pressed', 'false');
    await expect(page).not.toHaveURL(/agent=/);
  });

  test('agent deep link pre-selects agent on load', async ({ page }) => {
    await mockSnapshotApi(page);
    const agentParam = encodeURIComponent(E2E_AGENT_COORDINATOR);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&agent=${agentParam}&mode=legacy`);

    const coordinator = page.locator(`button[data-agent-id="${E2E_AGENT_COORDINATOR}"]`);
    await expect(coordinator).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('agent-detail-drawer')).toBeVisible();
    await expect(page.getByTestId('legacy-ring-graph')).toHaveAttribute(
      'aria-label',
      /delegation graph/i,
    );
  });
});
