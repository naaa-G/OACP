import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';

import type { TraceTimelineEvent } from '@oacp/observability-client';

import { MessageFlowItem } from './MessageFlowItem.js';
import {
  estimateMessageFeedRowSize,
  MESSAGE_FEED_ROW_GAP_PX,
} from '../utils/message-feed-virtual.js';

import styles from './VirtualizedMessageFeed.module.css';

export interface VirtualizedMessageFeedProps {
  readonly events: readonly TraceTimelineEvent[];
  readonly traceId?: string | undefined;
  readonly scrollRef: RefObject<HTMLDivElement | null>;
  readonly onScroll?: (() => void) | undefined;
  readonly onRegisterScrollToBottom?: ((scrollToBottom: () => void) => void) | undefined;
  readonly newMessageIds?: ReadonlySet<string> | undefined;
  readonly isLiveFeed?: boolean | undefined;
  readonly feedUpdatesPaused?: boolean | undefined;
  readonly replayMessageIndex?: number | undefined;
}

export function VirtualizedMessageFeed({
  events,
  traceId,
  scrollRef,
  onRegisterScrollToBottom,
  newMessageIds,
  isLiveFeed = false,
  feedUpdatesPaused = false,
  replayMessageIndex,
}: VirtualizedMessageFeedProps) {
  const [expandedMessageIds, setExpandedMessageIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const event = events[index];
      const expanded = event !== undefined && expandedMessageIds.has(event.message_id);
      return estimateMessageFeedRowSize(expanded);
    },
    overscan: 16,
    measureElement: (element) => element.getBoundingClientRect().height + MESSAGE_FEED_ROW_GAP_PX,
  });

  const toggleExpanded = useCallback((messageId: string) => {
    setExpandedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    if (events.length === 0) {
      return;
    }
    virtualizer.scrollToIndex(events.length - 1, { align: 'end', behavior: 'smooth' });
  }, [events.length, virtualizer]);

  useEffect(() => {
    onRegisterScrollToBottom?.(scrollToBottom);
  }, [onRegisterScrollToBottom, scrollToBottom]);

  useEffect(() => {
    virtualizer.measure();
  }, [expandedMessageIds, events.length, virtualizer]);

  useEffect(() => {
    if (replayMessageIndex === undefined) {
      return;
    }

    const rowIndex = events.findIndex((event) => event.index === replayMessageIndex);
    if (rowIndex < 0) {
      return;
    }

    virtualizer.scrollToIndex(rowIndex, { align: 'auto' });
  }, [events, replayMessageIndex, virtualizer]);

  const previousByIndex = useMemo(() => {
    const map = new Map<number, TraceTimelineEvent>();
    for (let index = 1; index < events.length; index += 1) {
      const current = events[index];
      const previous = events[index - 1];
      if (current !== undefined && previous !== undefined) {
        map.set(current.index, previous);
      }
    }
    return map;
  }, [events]);

  return (
    <div
      className={styles.list}
      role="list"
      aria-label="Message timeline"
      data-testid="feed-virtual-list"
      data-virtual-row-count={events.length}
    >
      <div className={styles.inner} style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const event = events[virtualRow.index];
          if (event === undefined) {
            return null;
          }

          const expanded = expandedMessageIds.has(event.message_id);

          return (
            <div
              key={event.message_id}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              className={styles.row}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <MessageFlowItem
                event={event}
                previousEvent={previousByIndex.get(event.index)}
                traceId={traceId}
                isNew={
                  isLiveFeed &&
                  !feedUpdatesPaused &&
                  (newMessageIds?.has(event.message_id) ?? false)
                }
                isScrubActive={replayMessageIndex === event.index}
                expanded={expanded}
                onToggleExpanded={() => {
                  toggleExpanded(event.message_id);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
