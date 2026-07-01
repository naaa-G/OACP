/** Distance from bottom (px) treated as "pinned" for smart auto-scroll (Day 48). */
export const FEED_SCROLL_PIN_THRESHOLD_PX = 50;

export function feedDistanceFromBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  return scrollHeight - scrollTop - clientHeight;
}

export function isFeedPinnedToBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  thresholdPx: number = FEED_SCROLL_PIN_THRESHOLD_PX,
): boolean {
  return feedDistanceFromBottom(scrollTop, scrollHeight, clientHeight) <= thresholdPx;
}

export function formatFeedNewMessagesLabel(count: number): string {
  const noun = count === 1 ? 'message' : 'messages';
  return `↓ ${count} new ${noun}`;
}
