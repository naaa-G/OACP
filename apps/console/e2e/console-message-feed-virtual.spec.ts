import { expect, test } from '@playwright/test';

import type { PlaygroundSnapshot, TraceTimelineEvent } from '@oacp/observability-client';

import { buildLargeTimelineSnapshot } from './fixtures/large-timeline.js';
import { buildE2eSnapshot, buildRunningE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';
import { seedFastReconcileInterval } from './helpers/live-feed.js';

test.describe('Console message feed virtual list (Day 49)', () => {
  test('renders 1000-message trace with virtual list', async ({ page }) => {
    const snapshot = buildLargeTimelineSnapshot(1000);

    await page.route('**/v1/observability/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: ': connected\n\n',
      });
    });

    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const virtualList = page.getByTestId('feed-virtual-list');
    await expect(virtualList).toBeVisible();
    await expect(virtualList).toHaveAttribute('data-virtual-row-count', '1000');

    const renderedRows = page.locator('[data-testid="feed-virtual-list"] [data-message-id]');
    const renderedCount = await renderedRows.count();
    expect(renderedCount).toBeGreaterThan(0);
    expect(renderedCount).toBeLessThan(80);

    const viewport = page.getByTestId('feed-scroll-viewport');
    await viewport.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('[data-testid="feed-virtual-list"] [data-message-id]');
      return rows.length > 0 && Array.from(rows).some((row) => row.textContent?.includes('999'));
    });
  });

  test('expands a row with JSON detail and latency', async ({ page }) => {
    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          snapshot: buildE2eSnapshot(E2E_TRACE_ID),
        }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const expandButton = page.getByTestId('feed-expand-msg-response-1');
    await expandButton.click();

    const details = page.getByTestId('feed-details-msg-response-1');
    await expect(details).toBeVisible();
    await expect(details).toContainText('Latency');
    await expect(details).toContainText('msg-response-1');
    await expect(details).toContainText('"latency_ms"');
  });

  test('filters feed rows by type and text', async ({ page }) => {
    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          snapshot: buildE2eSnapshot(E2E_TRACE_ID),
        }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await page.getByTestId('feed-filter-type').selectOption('task_response');
    await expect(page.locator('#feedPanel')).toHaveAttribute('data-feed-row-count', '1');
    await expect(page.getByText('task_response (success)')).toBeVisible();

    await page.getByTestId('feed-filter-clear').click();
    await expect(page.locator('#feedPanel')).toHaveAttribute('data-feed-row-count', '3');

    await page.getByTestId('feed-filter-text').fill('coordinator');
    await expect(page.getByText('task_request from coordinator')).toBeVisible();
  });
});

test.describe('Console message feed hover pause (Day 49)', () => {
  test('buffers live updates while hovered and flushes on mouse leave', async ({ page }) => {
    let pollCount = 0;
    const base = buildRunningE2eSnapshot(E2E_TRACE_ID);
    const baseTimeline = base.active_trace!.timeline;

    await seedFastReconcileInterval(page);
    await page.route('**/v1/observability/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: ': connected\n\n',
      });
    });

    await page.route('**/v1/observability/snapshot**', async (route) => {
      pollCount += 1;
      const extra: TraceTimelineEvent[] = [];
      for (let index = 0; index < Math.min(pollCount, 5); index += 1) {
        extra.push({
          index: baseTimeline.length + index,
          timestamp: `2026-06-21T00:01:${String(index).padStart(2, '0')}.000Z`,
          type: 'task_request',
          from: 'agent://coordinator',
          to: 'agent://worker',
          message_id: `msg-hover-${index}`,
          summary: `hover message ${index}`,
        });
      }

      const snapshot: PlaygroundSnapshot = {
        ...base,
        active_trace: {
          ...base.active_trace!,
          message_count: baseTimeline.length + extra.length,
          timeline: [...baseTimeline, ...extra],
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);
    await expect(page.getByTestId('feed-virtual-list')).toBeVisible();

    const initialCount = await page.locator('#feedPanel').getAttribute('data-feed-row-count');
    await page.getByTestId('feed-scroll-root').hover();

    await page.waitForFunction(
      () => document.querySelector('#feedPanel')?.getAttribute('data-feed-hover-paused') === 'true',
    );

    await page.waitForFunction(
      (startCount) => {
        const panel = document.querySelector('#feedPanel');
        const buffered = Number(panel?.getAttribute('data-feed-buffered-count') ?? '0');
        const rowCount = Number(panel?.getAttribute('data-feed-row-count') ?? '0');
        return buffered > 0 && rowCount === Number(startCount);
      },
      initialCount,
      { timeout: 10_000 },
    );

    await page.mouse.move(0, 0);

    await page.waitForFunction(
      () =>
        document.querySelector('#feedPanel')?.getAttribute('data-feed-hover-paused') === 'false',
    );

    await page.waitForFunction((startCount) => {
      const panel = document.querySelector('#feedPanel');
      return Number(panel?.getAttribute('data-feed-row-count') ?? '0') > Number(startCount);
    }, initialCount);
  });
});
