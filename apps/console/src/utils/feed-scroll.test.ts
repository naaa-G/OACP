import { describe, expect, it } from 'vitest';

import {
  FEED_SCROLL_PIN_THRESHOLD_PX,
  feedDistanceFromBottom,
  formatFeedNewMessagesLabel,
  isFeedPinnedToBottom,
} from './feed-scroll.js';

describe('feed-scroll', () => {
  it('detects pinned state within threshold', () => {
    expect(isFeedPinnedToBottom(950, 1000, 100, FEED_SCROLL_PIN_THRESHOLD_PX)).toBe(true);
    expect(isFeedPinnedToBottom(0, 1000, 100, FEED_SCROLL_PIN_THRESHOLD_PX)).toBe(false);
    expect(isFeedPinnedToBottom(850, 1000, 100, FEED_SCROLL_PIN_THRESHOLD_PX)).toBe(true);
    expect(isFeedPinnedToBottom(849, 1000, 100, FEED_SCROLL_PIN_THRESHOLD_PX)).toBe(false);
  });

  it('computes distance from bottom', () => {
    expect(feedDistanceFromBottom(400, 1000, 200)).toBe(400);
    expect(feedDistanceFromBottom(750, 1000, 200)).toBe(50);
  });

  it('formats new message chip copy', () => {
    expect(formatFeedNewMessagesLabel(1)).toBe('↓ 1 new message');
    expect(formatFeedNewMessagesLabel(3)).toBe('↓ 3 new messages');
  });
});
