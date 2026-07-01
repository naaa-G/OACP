import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { isFeedPinnedToBottom } from '../utils/feed-scroll.js';

export interface UseMessageFeedScrollOptions {
  readonly itemCount: number;
  readonly enabled: boolean;
}

export interface UseMessageFeedScrollResult {
  readonly scrollRef: RefObject<HTMLDivElement | null>;
  readonly isPinnedToBottom: boolean;
  readonly pendingCount: number;
  readonly handleScroll: () => void;
  readonly scrollToBottom: () => void;
  readonly resetForScopeChange: () => void;
}

/** Smart auto-scroll — pin to bottom within 50px; count messages while scrolled up (Day 48). */
export function useMessageFeedScroll({
  itemCount,
  enabled,
}: UseMessageFeedScrollOptions): UseMessageFeedScrollResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const prevCountRef = useRef(itemCount);
  const itemCountRef = useRef(itemCount);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  itemCountRef.current = itemCount;

  const measurePinned = useCallback((): boolean => {
    const element = scrollRef.current;
    if (element === null) {
      return true;
    }

    return isFeedPinnedToBottom(element.scrollTop, element.scrollHeight, element.clientHeight);
  }, []);

  const handleScroll = useCallback(() => {
    const pinned = measurePinned();
    isPinnedRef.current = pinned;
    setIsPinnedToBottom(pinned);
    if (pinned) {
      setPendingCount(0);
    }
  }, [measurePinned]);

  const scrollToBottom = useCallback(() => {
    const element = scrollRef.current;
    if (element === null) {
      return;
    }

    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    isPinnedRef.current = true;
    setIsPinnedToBottom(true);
    setPendingCount(0);
  }, []);

  const resetForScopeChange = useCallback(() => {
    isPinnedRef.current = true;
    setIsPinnedToBottom(true);
    setPendingCount(0);
    prevCountRef.current = itemCountRef.current;
  }, []);

  useEffect(() => {
    if (!enabled) {
      prevCountRef.current = itemCount;
      setPendingCount(0);
      return;
    }

    const delta = itemCount - prevCountRef.current;
    prevCountRef.current = itemCount;

    if (delta <= 0) {
      return;
    }

    const pinned = measurePinned();
    isPinnedRef.current = pinned;
    setIsPinnedToBottom(pinned);

    if (pinned) {
      requestAnimationFrame(() => {
        const element = scrollRef.current;
        if (element === null) {
          return;
        }
        element.scrollTop = element.scrollHeight;
      });
      return;
    }

    setPendingCount((current) => current + delta);
  }, [enabled, itemCount, measurePinned]);

  return {
    scrollRef,
    isPinnedToBottom,
    pendingCount,
    handleScroll,
    scrollToBottom,
    resetForScopeChange,
  };
}
