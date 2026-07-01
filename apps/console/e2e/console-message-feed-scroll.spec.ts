import { expect, test } from '@playwright/test';

import type { PlaygroundSnapshot, TraceTimelineEvent } from '@oacp/observability-client';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';
import { seedFastReconcileInterval } from './helpers/live-feed.js';

function timelineEvent(messageId: string, index: number): TraceTimelineEvent {
  return {
    index,
    timestamp: `2026-06-21T00:00:${String(index).padStart(2, '0')}.000Z`,
    type: 'task_request',
    from: 'agent://coordinator',
    to: 'agent://worker',
    message_id: messageId,
    summary: `message ${messageId}`,
  };
}

function buildScrollableTimeline(count: number): TraceTimelineEvent[] {
  return Array.from({ length: count }, (_, index) =>
    timelineEvent(`msg-scrollable-${index}`, index),
  );
}

async function seedScrollableFeed(page: import('@playwright/test').Page): Promise<void> {
  const viewport = page.getByTestId('feed-scroll-viewport');
  await viewport.evaluate((element) => {
    element.style.maxHeight = '16rem';
    const items = element.querySelectorAll('[data-message-id]');
    for (const item of items) {
      if (item instanceof HTMLElement) {
        item.style.minHeight = '4rem';
      }
    }
  });
}

async function scrollFeedToTop(page: import('@playwright/test').Page): Promise<void> {
  const viewport = page.getByTestId('feed-scroll-viewport');
  await viewport.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
}

async function waitForScrollableFeed(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-testid="feed-scroll-viewport"]');
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    return element.scrollHeight > element.clientHeight + 60;
  });
}

test.describe('Console message feed scroll (Day 48)', () => {
  test('does not jump scroll when user reads history in live mode', async ({ page }) => {
    let pollCount = 0;
    const base = buildE2eSnapshot(E2E_TRACE_ID);
    const seedTimeline = buildScrollableTimeline(24);

    await page.route('**/v1/observability/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: ': connected\n\n',
      });
    });

    await page.route('**/v1/observability/snapshot**', async (route) => {
      pollCount += 1;
      const extraCount = Math.min(pollCount, 6);
      const timeline = [
        ...seedTimeline,
        ...Array.from({ length: extraCount }, (_, index) =>
          timelineEvent(`msg-scroll-${index}`, seedTimeline.length + index),
        ),
      ];

      const snapshot: PlaygroundSnapshot = {
        ...base,
        active_trace: {
          ...base.active_trace!,
          message_count: timeline.length,
          timeline,
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const viewport = page.getByTestId('feed-scroll-viewport');
    await expect(viewport).toBeVisible();
    await seedScrollableFeed(page);
    await waitForScrollableFeed(page);
    await scrollFeedToTop(page);

    await scrollFeedToTop(page);

    await page.waitForFunction(() => {
      const panel = document.querySelector('#feedPanel');
      return panel?.getAttribute('data-feed-pinned') === 'false';
    });

    const scrollTopBefore = await viewport.evaluate((element) => element.scrollTop);
    expect(scrollTopBefore).toBe(0);

    await page.waitForFunction(() => {
      const panel = document.querySelector('#feedPanel');
      return Number(panel?.getAttribute('data-feed-pending-scroll') ?? '0') > 0;
    });

    const scrollTopAfter = await viewport.evaluate((element) => element.scrollTop);
    expect(scrollTopAfter).toBe(scrollTopBefore);

    await expect(page.getByTestId('feed-new-messages-chip')).toBeVisible();
  });

  test('clicking new messages chip scrolls to bottom and clears count', async ({ page }) => {
    let pollCount = 0;
    const base = buildE2eSnapshot(E2E_TRACE_ID);
    const seedTimeline = buildScrollableTimeline(24);

    await page.route('**/v1/observability/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: ': connected\n\n',
      });
    });

    await page.route('**/v1/observability/snapshot**', async (route) => {
      pollCount += 1;
      const extraCount = Math.min(pollCount, 6);
      const timeline = [
        ...seedTimeline,
        ...Array.from({ length: extraCount }, (_, index) =>
          timelineEvent(`msg-chip-${index}`, seedTimeline.length + index),
        ),
      ];

      const snapshot: PlaygroundSnapshot = {
        ...base,
        active_trace: {
          ...base.active_trace!,
          message_count: timeline.length,
          timeline,
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const viewport = page.getByTestId('feed-scroll-viewport');
    await expect(viewport).toBeVisible();
    await seedScrollableFeed(page);
    await waitForScrollableFeed(page);
    await scrollFeedToTop(page);

    await page.waitForFunction(() => {
      const panel = document.querySelector('#feedPanel');
      return panel?.getAttribute('data-feed-pinned') === 'false';
    });

    await page.waitForFunction(() => {
      const panel = document.querySelector('#feedPanel');
      return Number(panel?.getAttribute('data-feed-pending-scroll') ?? '0') > 0;
    });

    await page.getByTestId('feed-new-messages-chip').click();

    await page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="feed-scroll-viewport"]');
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
      return distance <= 50;
    });

    await expect(page.locator('#feedPanel')).toHaveAttribute('data-feed-pending-scroll', '0');
    await expect(viewport).toBeVisible();
  });

  test('pause feed toggle buffers updates until resumed', async ({ page }) => {
    let pollCount = 0;
    const base = buildE2eSnapshot(E2E_TRACE_ID);
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
        extra.push(timelineEvent(`msg-pause-${index}`, baseTimeline.length + index));
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
    await expect(page.getByLabel('Message timeline')).toBeVisible();

    const initialCount = await page.locator('#feedPanel').getAttribute('data-feed-row-count');
    await page.getByTestId('feed-pause-toggle').click();
    await expect(page.locator('#feedPanel')).toHaveAttribute('data-feed-paused', 'true');

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

    await page.getByTestId('feed-pause-toggle').click();
    await expect(page.locator('#feedPanel')).toHaveAttribute('data-feed-paused', 'false');

    await page.waitForFunction((startCount) => {
      const panel = document.querySelector('#feedPanel');
      return Number(panel?.getAttribute('data-feed-row-count') ?? '0') > Number(startCount);
    }, initialCount);
  });
});
