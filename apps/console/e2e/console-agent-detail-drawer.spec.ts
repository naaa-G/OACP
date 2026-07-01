import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';

const E2E_AGENT_COORDINATOR = 'agent://coordinator';
const E2E_AGENT_WORKER = 'agent://worker';

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

test.describe('Agent detail drawer (Day 21)', () => {
  test('opens drawer on agent card click without hiding graph or feed', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_COORDINATOR}"]`).click();

    const drawer = page.getByTestId('agent-detail-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('heading', { name: 'Coordinator' })).toBeVisible();
    await expect(page.getByTestId('legacy-ring-graph')).toBeVisible();
    await expect(page.getByLabel('Message timeline')).toBeVisible();
  });

  test('shows identity, capabilities, traces, and messages sections', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_WORKER}"]`).click();

    const drawer = page.getByTestId('agent-detail-drawer');
    await expect(drawer.getByText('Identity')).toBeVisible();
    await expect(drawer.getByText('Capabilities')).toBeVisible();
    await expect(drawer.getByText('Recent traces')).toBeVisible();
    await expect(drawer.getByText('Messages in current trace')).toBeVisible();
    await expect(drawer.getByTestId('agent-detail-fingerprint')).toBeVisible();
    await expect(drawer.getByTestId('agent-detail-capability-echo')).toBeVisible();
    await expect(drawer.getByTestId('agent-detail-message-msg-request-1')).toBeVisible();
    await expect(drawer.getByTestId('agent-detail-message-msg-response-1')).toBeVisible();
  });

  test('shows MCPLab config link for mcplab fleet agents', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_COORDINATOR}"]`).click();

    const configLink = page.getByTestId('agent-detail-mcplab-config');
    await expect(configLink).toBeVisible();
    await expect(configLink).toHaveAttribute('href', /\/agents\/coordinator$/);
  });

  test('closes drawer with escape key', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_COORDINATOR}"]`).click();
    await expect(page.getByTestId('agent-detail-drawer')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('agent-detail-drawer')).toHaveCount(0);
    await expect(page.getByTestId('legacy-ring-graph')).toBeVisible();
  });

  test('closes drawer on backdrop click', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_COORDINATOR}"]`).click();
    await expect(page.getByTestId('agent-detail-drawer')).toBeVisible();

    await page.getByTestId('agent-detail-backdrop').click({ force: true });
    await expect(page.getByTestId('agent-detail-drawer')).toHaveCount(0);
  });

  test('opens drawer from agent deep link on load', async ({ page }) => {
    await mockSnapshotApi(page);
    const agentParam = encodeURIComponent(E2E_AGENT_COORDINATOR);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&agent=${agentParam}&mode=legacy`);

    await expect(page.getByTestId('agent-detail-drawer')).toBeVisible();
    await expect(page.getByTestId('agent-detail-drawer')).toContainText('Coordinator');
  });

  test('copy URI button is available in identity section', async ({ page }) => {
    await mockSnapshotApi(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.locator(`button[data-agent-id="${E2E_AGENT_WORKER}"]`).click();
    await expect(page.getByTestId('agent-detail-copy-uri')).toBeVisible();
  });
});
