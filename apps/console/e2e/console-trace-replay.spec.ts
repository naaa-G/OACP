import { expect, test } from '@playwright/test';

import {
  buildE2eReplaySnapshot,
  buildE2eReplayTraceGraph,
  E2E_REPLAY_PLANNER,
  E2E_REPLAY_TRACE_ID,
  E2E_REPLAY_WORKER,
} from './fixtures/replay-snapshot.js';

async function mockReplayApi(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/v1/observability/snapshot**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, snapshot: buildE2eReplaySnapshot() }),
    });
  });

  await page.route('**/v1/observability/traces/*/graph', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, graph: buildE2eReplayTraceGraph() }),
    });
  });
}

test.describe('Ops 2D trace replay scrubber (Day 33)', () => {
  test('renders replay scrubber for multi-message traces', async ({ page }) => {
    await mockReplayApi(page);
    await page.goto(`/?trace_id=${E2E_REPLAY_TRACE_ID}&mode=ops`);

    await expect(page.getByTestId('trace-replay-scrubber')).toBeVisible();
    await expect(page.getByTestId('trace-replay-slider')).toBeVisible();
    await expect(page.getByTestId('trace-replay-label')).toContainText('Live');
  });

  test('scrubbing hides agents not yet introduced in the trace', async ({ page }) => {
    await mockReplayApi(page);
    await page.goto(`/?trace_id=${E2E_REPLAY_TRACE_ID}&mode=ops`);

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph.locator(`[data-agent-id="${E2E_REPLAY_PLANNER}"]`)).toBeVisible();

    const slider = page.getByTestId('trace-replay-slider');
    await slider.fill('0');

    await expect(opsGraph).toHaveAttribute('data-replay-active', 'true');
    await expect(opsGraph.locator(`[data-agent-id="${E2E_REPLAY_WORKER}"]`)).toBeVisible();
    await expect(opsGraph.locator(`[data-agent-id="${E2E_REPLAY_PLANNER}"]`)).toHaveCount(0);
  });

  test('scrub to final message reveals full delegation graph', async ({ page }) => {
    await mockReplayApi(page);
    await page.goto(`/?trace_id=${E2E_REPLAY_TRACE_ID}&mode=ops`);

    const slider = page.getByTestId('trace-replay-slider');
    await slider.fill('2');

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph.locator(`[data-agent-id="${E2E_REPLAY_PLANNER}"]`)).toBeVisible();
    await expect(page.getByTestId('ops-graph-edge-coordinator-idle-planner-1')).toBeVisible();
  });

  test('scrubber syncs message feed highlight and scroll position', async ({ page }) => {
    await mockReplayApi(page);
    await page.goto(`/?trace_id=${E2E_REPLAY_TRACE_ID}&mode=ops`);

    await page.getByTestId('trace-replay-slider').fill('1');

    const activeFeedItem = page.locator('[data-scrub-active="true"]');
    await expect(activeFeedItem).toHaveCount(1);
    await expect(activeFeedItem).toHaveAttribute('data-message-index', '1');
  });

  test('pause keeps graph frozen at scrubbed index', async ({ page }) => {
    await mockReplayApi(page);
    await page.goto(`/?trace_id=${E2E_REPLAY_TRACE_ID}&mode=ops`);

    await page.getByTestId('trace-replay-play').click();
    await expect(page.getByTestId('trace-replay-pause')).toBeVisible();

    await page.getByTestId('trace-replay-pause').click();
    await expect(page.getByTestId('trace-replay-play')).toBeVisible();

    const opsGraph = page.getByTestId('ops-graph');
    await expect(opsGraph).toHaveAttribute('data-replay-active', 'true');
    await expect(opsGraph.locator(`[data-agent-id="${E2E_REPLAY_PLANNER}"]`)).toHaveCount(0);
  });

  test('go live restores full graph and feed tail', async ({ page }) => {
    await mockReplayApi(page);
    await page.goto(`/?trace_id=${E2E_REPLAY_TRACE_ID}&mode=ops`);

    await page.getByTestId('trace-replay-slider').fill('0');
    await page.getByTestId('trace-replay-go-live').click();

    await expect(page.getByTestId('trace-replay-scrubber')).toHaveAttribute(
      'data-replay-live',
      'true',
    );
    await expect(
      page.getByTestId('ops-graph').locator(`[data-agent-id="${E2E_REPLAY_PLANNER}"]`),
    ).toBeVisible();
    await expect(page.locator('[data-scrub-active="true"]')).toHaveCount(0);
  });
});
