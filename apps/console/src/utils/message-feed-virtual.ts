/** Gap between virtualized feed rows (px). */
export const MESSAGE_FEED_ROW_GAP_PX = 6;

/** Estimated collapsed row height for TanStack Virtual (Day 49). */
export const MESSAGE_FEED_ROW_COLLAPSED_PX = 56;

/** Estimated expanded row height before measureElement refines layout. */
export const MESSAGE_FEED_ROW_EXPANDED_PX = 240;

export function estimateMessageFeedRowSize(expanded: boolean): number {
  return (
    (expanded ? MESSAGE_FEED_ROW_EXPANDED_PX : MESSAGE_FEED_ROW_COLLAPSED_PX) +
    MESSAGE_FEED_ROW_GAP_PX
  );
}
