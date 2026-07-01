import { expect, test } from '@playwright/test';

import type { PlaygroundSnapshot, TraceTimelineEvent } from '@oacp/observability-client';

import { buildE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';

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

test.describe('Console message feed (Day 47)', () => {
  test('appends rows incrementally without dropping existing message ids', async ({ page }) => {
    let pollCount = 0;
    const base = buildE2eSnapshot(E2E_TRACE_ID);

    await page.route('**/v1/observability/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: ': connected\n\n',
      });
    });

    await page.route('**/v1/observability/snapshot**', async (route) => {
      pollCount += 1;
      const extraCount = Math.min(pollCount, 5);
      const extra: TraceTimelineEvent[] = [];
      for (let index = 0; index < extraCount; index += 1) {
        extra.push(timelineEvent(`msg-live-${index}`, base.active_trace!.timeline.length + index));
      }

      const snapshot: PlaygroundSnapshot = {
        ...base,
        active_trace: {
          ...base.active_trace!,
          message_count: base.active_trace!.timeline.length + extra.length,
          timeline: [...base.active_trace!.timeline, ...extra],
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    const feedPanel = page.locator('#feedPanel');
    const feed = page.getByLabel('Message timeline');
    await expect(feed).toBeVisible();

    await expect(feedPanel).toHaveAttribute('data-feed-live', 'true');
    await expect(feed.locator('[data-message-id="msg-response-1"]')).toBeVisible();

    await page.waitForFunction(() => {
      const panel = document.querySelector('#feedPanel');
      const count = Number(panel?.getAttribute('data-feed-row-count') ?? '0');
      return count >= 4;
    });

    const messageIds = await feed
      .locator('[data-message-id]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-message-id')));

    expect(messageIds).toContain('msg-response-1');
    expect(messageIds.filter((id) => id?.startsWith('msg-live-')).length).toBeGreaterThanOrEqual(1);

    const uniqueIds = new Set(messageIds);
    expect(uniqueIds.size).toBe(messageIds.length);
  });
});
