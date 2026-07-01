import { expect, test } from '@playwright/test';

import type { PlaygroundSnapshot } from '@oacp/observability-client';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';

async function mockSnapshotRoute(page: import('@playwright/test').Page): Promise<void> {
  const snapshot = buildE2eSnapshot(E2E_TRACE_ID);

  await page.route('**/v1/observability/events**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: ': connected\n\n',
    });
  });

  await page.route('**/v1/observability/snapshot**', async (route) => {
    const body: PlaygroundSnapshot = {
      ...snapshot,
      active_trace: {
        ...snapshot.active_trace!,
        message_count: snapshot.active_trace!.timeline.length,
      },
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, snapshot: body }),
    });
  });
}

test.describe('Console message feed polish (Day 50)', () => {
  test('applies stable message tone accents for enterprise scanning', async ({ page }) => {
    await mockSnapshotRoute(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await expect(page.getByLabel('Message timeline')).toBeVisible();
    await expect(page.locator('[data-message-id="msg-request-1"]')).toHaveAttribute(
      'data-message-tone',
      'request',
    );
    await expect(page.locator('[data-message-id="msg-delegation-1"]')).toHaveAttribute(
      'data-message-tone',
      'delegation',
    );
    await expect(page.locator('[data-message-id="msg-response-1"]')).toHaveAttribute(
      'data-message-tone',
      'response-success',
    );
  });

  test('exports filtered timeline as JSONL and CSV downloads', async ({ page }) => {
    await mockSnapshotRoute(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await expect(page.getByTestId('feed-export-jsonl')).toBeVisible();

    const jsonlDownload = page.waitForEvent('download');
    await page.getByTestId('feed-export-jsonl').click();
    const jsonlFile = await jsonlDownload;
    expect(jsonlFile.suggestedFilename()).toMatch(/oacp-timeline-.*\.jsonl$/);

    const csvDownload = page.waitForEvent('download');
    await page.getByTestId('feed-export-csv').click();
    const csvFile = await csvDownload;
    expect(csvFile.suggestedFilename()).toMatch(/oacp-timeline-.*\.csv$/);
  });

  test('shows trace rail duration and status badges', async ({ page }) => {
    await mockSnapshotRoute(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const selectedRow = page.locator(`button[id="trace-row-${E2E_TRACE_ID}"]`);
    await expect(selectedRow).toHaveAttribute('data-trace-status', 'completed');
    await expect(selectedRow.getByText('Completed')).toBeVisible();
    await expect(selectedRow.locator('[class*="durationBadge"]')).toHaveText('1m 00s');

    const runningRow = page.locator(`button[data-trace-status="running"]`);
    await expect(runningRow.getByText('Running')).toBeVisible();
  });

  test('defaults reconcile interval to 30s with SSE-primary live mode', async ({ page }) => {
    await mockSnapshotRoute(page);
    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const reconcileSelect = page.getByTestId('header-reconcile-interval');
    await expect(reconcileSelect).toHaveValue('30000');
    await expect(reconcileSelect).toContainText('Reconcile 30s');
  });
});
