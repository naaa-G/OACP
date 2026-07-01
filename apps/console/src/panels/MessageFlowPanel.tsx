import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FeedNewMessagesChip } from '../components/FeedNewMessagesChip.js';
import { MessageFeedFilterBar } from '../components/MessageFeedFilterBar.js';
import { VirtualizedMessageFeed } from '../components/VirtualizedMessageFeed.js';
import { useIncrementalMessageFeed } from '../hooks/useIncrementalMessageFeed.js';
import { useMessageFeedScroll } from '../hooks/useMessageFeedScroll.js';
import type { TraceTimelineEvent } from '@oacp/observability-client';
import { FEED_VIRTUAL_TAIL_LIMIT } from '@oacp/observability-client';
import { Panel, Toggle } from '@oacp/ui';

import {
  collectMessageFeedFilterOptions,
  countActiveMessageFeedFilters,
  DEFAULT_MESSAGE_FEED_FILTERS,
  filterTimelineForFeed,
} from '../utils/message-feed-filter.js';
import { downloadTimelineExport, type TimelineExportFormat } from '../utils/timeline-export.js';

import styles from './MessageFlowPanel.module.css';

export interface MessageFlowPanelProps {
  readonly timeline?: readonly TraceTimelineEvent[] | undefined;
  readonly selectedTraceId?: string | undefined;
  readonly selectedAgentId?: string | undefined;
  readonly selectedAgentLabel?: string | undefined;
  readonly isLoading?: boolean | undefined;
  readonly isReconnecting?: boolean | undefined;
  readonly isOffline?: boolean | undefined;
  readonly liveEnabled?: boolean | undefined;
  readonly replayMessageIndex?: number | undefined;
}

export function MessageFlowPanel({
  timeline,
  selectedTraceId,
  selectedAgentId,
  selectedAgentLabel,
  isLoading = false,
  isReconnecting = false,
  isOffline = false,
  liveEnabled = true,
  replayMessageIndex,
}: MessageFlowPanelProps) {
  const isReplay = replayMessageIndex !== undefined;
  const isLiveFeed = liveEnabled && !isReplay;
  const scrollToBottomRef = useRef<(() => void) | null>(null);
  const [feedPaused, setFeedPaused] = useState(false);
  const [feedHovered, setFeedHovered] = useState(false);
  const [feedFilters, setFeedFilters] = useState(DEFAULT_MESSAGE_FEED_FILTERS);

  const feedUpdatesPaused = isLiveFeed && (feedPaused || feedHovered);

  const { events, newMessageIds, bufferedCount } = useIncrementalMessageFeed({
    timeline,
    selectedTraceId,
    selectedAgentId,
    liveEnabled: isLiveFeed,
    feedPaused: feedUpdatesPaused,
    tailLimit: FEED_VIRTUAL_TAIL_LIMIT,
  });

  const replayEvents =
    isReplay && timeline !== undefined ? timeline.slice(0, replayMessageIndex + 1) : events;

  const displayEvents = isReplay
    ? selectedAgentId === undefined
      ? replayEvents
      : replayEvents.filter(
          (event) => event.from === selectedAgentId || event.to === selectedAgentId,
        )
    : events;

  const filteredEvents = useMemo(
    () => filterTimelineForFeed(displayEvents, feedFilters),
    [displayEvents, feedFilters],
  );

  const filterOptions = useMemo(
    () => collectMessageFeedFilterOptions(displayEvents),
    [displayEvents],
  );

  const activeFilterCount = useMemo(
    () => countActiveMessageFeedFilters(feedFilters),
    [feedFilters],
  );

  const {
    scrollRef,
    pendingCount,
    isPinnedToBottom,
    handleScroll,
    scrollToBottom,
    resetForScopeChange,
  } = useMessageFeedScroll({
    itemCount: filteredEvents.length,
    enabled: isLiveFeed && !feedPaused,
  });

  const totalTimelineCount = timeline?.length ?? 0;
  const isAgentFiltered = selectedAgentId !== undefined;

  useEffect(() => {
    resetForScopeChange();
    setFeedPaused(false);
    setFeedHovered(false);
    setFeedFilters(DEFAULT_MESSAGE_FEED_FILTERS);
  }, [resetForScopeChange, selectedAgentId, selectedTraceId]);

  const handleResumeFeed = useCallback(() => {
    setFeedPaused(false);
  }, []);

  const handleScrollToBottom = useCallback(() => {
    scrollToBottomRef.current?.();
    scrollToBottom();
  }, [scrollToBottom]);

  const handleRegisterScrollToBottom = useCallback((scrollToEnd: () => void) => {
    scrollToBottomRef.current = scrollToEnd;
  }, []);

  const handleFeedMouseEnter = useCallback(() => {
    if (isLiveFeed) {
      setFeedHovered(true);
    }
  }, [isLiveFeed]);

  const handleFeedMouseLeave = useCallback(() => {
    setFeedHovered(false);
  }, []);

  const handleExportTimeline = useCallback(
    (format: TimelineExportFormat) => {
      downloadTimelineExport(filteredEvents, selectedTraceId, format);
    },
    [filteredEvents, selectedTraceId],
  );

  const showReconnecting = isReconnecting;
  const showAgentFilterEmpty =
    !isLoading &&
    !isReconnecting &&
    isAgentFiltered &&
    selectedTraceId !== undefined &&
    totalTimelineCount > 0 &&
    displayEvents.length === 0;
  const showWaiting =
    !isLoading &&
    !isReconnecting &&
    !showAgentFilterEmpty &&
    (selectedTraceId === undefined || displayEvents.length === 0);
  const showLoading =
    isLoading && !isReconnecting && selectedTraceId !== undefined && displayEvents.length === 0;
  const showList = filteredEvents.length > 0;
  const showFilterEmpty =
    !showLoading && !showReconnecting && displayEvents.length > 0 && filteredEvents.length === 0;

  const footer =
    displayEvents.length > 0 &&
    (totalTimelineCount > displayEvents.length || activeFilterCount > 0 || isAgentFiltered) ? (
      <p className={styles.footerNote}>
        {totalTimelineCount > displayEvents.length
          ? `Showing last ${displayEvents.length} of ${totalTimelineCount} messages`
          : `${displayEvents.length} message${displayEvents.length === 1 ? '' : 's'}`}
        {isAgentFiltered ? ` for ${selectedAgentLabel ?? selectedAgentId}` : ''}
        {activeFilterCount > 0 ? ` · ${filteredEvents.length} match filters` : ''}
      </p>
    ) : undefined;

  const feedHeaderActions =
    isLiveFeed || filteredEvents.length > 0 ? (
      <div className={styles.headerActions}>
        {filteredEvents.length > 0 ? (
          <div className={styles.exportActions} aria-label="Timeline export actions">
            <button
              type="button"
              className={styles.exportButton}
              data-testid="feed-export-jsonl"
              onClick={() => {
                handleExportTimeline('jsonl');
              }}
            >
              JSONL
            </button>
            <button
              type="button"
              className={styles.exportButton}
              data-testid="feed-export-csv"
              onClick={() => {
                handleExportTimeline('csv');
              }}
            >
              CSV
            </button>
          </div>
        ) : null}
        {isLiveFeed ? (
          <Toggle
            label={feedPaused && bufferedCount > 0 ? `Feed (${bufferedCount} buffered)` : 'Feed'}
            checked={!feedPaused}
            data-testid="feed-pause-toggle"
            aria-label={
              feedPaused
                ? `Resume feed${bufferedCount > 0 ? ` — ${bufferedCount} buffered messages` : ''}`
                : 'Pause feed updates'
            }
            onChange={(event) => {
              setFeedPaused(!event.target.checked);
            }}
          />
        ) : null}
      </div>
    ) : undefined;

  return (
    <Panel
      id="feedPanel"
      title="Message flow"
      bodyClassName={styles.body}
      footer={footer}
      headerActions={feedHeaderActions}
      aria-label="Message flow"
      aria-busy={isLoading}
      data-feed-row-count={filteredEvents.length}
      data-feed-live={isLiveFeed ? 'true' : 'false'}
      data-feed-paused={feedPaused ? 'true' : 'false'}
      data-feed-hover-paused={feedHovered ? 'true' : 'false'}
      data-feed-buffered-count={bufferedCount}
      data-feed-pending-scroll={pendingCount}
      data-feed-pinned={isPinnedToBottom ? 'true' : 'false'}
    >
      {isAgentFiltered ? (
        <p className={styles.filterBar} data-testid="feed-agent-filter-bar" role="status">
          Showing messages for <strong>{selectedAgentLabel ?? selectedAgentId}</strong>
        </p>
      ) : null}

      {feedPaused && bufferedCount > 0 ? (
        <p className={styles.pausedNote} data-testid="feed-paused-banner" role="status">
          Feed paused — {bufferedCount} message{bufferedCount === 1 ? '' : 's'} buffered.{' '}
          <button type="button" className={styles.pausedAction} onClick={handleResumeFeed}>
            Resume
          </button>
        </p>
      ) : null}

      {feedHovered && bufferedCount > 0 ? (
        <p className={styles.hoverNote} data-testid="feed-hover-paused-banner" role="status">
          Hover pause — {bufferedCount} message{bufferedCount === 1 ? '' : 's'} buffered
        </p>
      ) : null}

      {showList || displayEvents.length > 0 ? (
        <MessageFeedFilterBar
          filters={feedFilters}
          options={filterOptions}
          activeFilterCount={activeFilterCount}
          onChange={setFeedFilters}
          onClear={() => {
            setFeedFilters(DEFAULT_MESSAGE_FEED_FILTERS);
          }}
        />
      ) : null}

      {showLoading ? (
        <p className="oacp-empty" role="status">
          Loading message timeline…
        </p>
      ) : null}

      {showReconnecting ? (
        <p className="oacp-empty" role="status" data-testid="feed-reconnecting">
          Reconnecting to OACP server…
        </p>
      ) : null}

      {showAgentFilterEmpty ? (
        <p className="oacp-empty" data-testid="feed-agent-filter-empty" role="status">
          No messages for {selectedAgentLabel ?? selectedAgentId} in this trace.
        </p>
      ) : null}

      {showFilterEmpty ? (
        <p className="oacp-empty" data-testid="feed-filter-empty" role="status">
          No messages match the current feed filters.
        </p>
      ) : null}

      {showWaiting ? (
        <p className="oacp-empty" data-testid="feed-empty-state">
          {isOffline
            ? 'Snapshot unavailable — message flow resumes when the OACP server reconnects.'
            : selectedTraceId === undefined
              ? 'Select a trace to view message flow.'
              : 'Waiting for messages…'}
        </p>
      ) : null}

      {showList ? (
        <div
          className={styles.scrollRoot}
          data-testid="feed-scroll-root"
          onMouseEnter={handleFeedMouseEnter}
          onMouseLeave={handleFeedMouseLeave}
        >
          {!feedUpdatesPaused && pendingCount > 0 ? (
            <FeedNewMessagesChip count={pendingCount} onClick={handleScrollToBottom} />
          ) : null}
          <div
            ref={scrollRef}
            className={styles.scrollViewport}
            data-testid="feed-scroll-viewport"
            onScroll={handleScroll}
          >
            <VirtualizedMessageFeed
              events={filteredEvents}
              traceId={selectedTraceId}
              scrollRef={scrollRef}
              onScroll={handleScroll}
              onRegisterScrollToBottom={handleRegisterScrollToBottom}
              newMessageIds={newMessageIds}
              isLiveFeed={isLiveFeed}
              feedUpdatesPaused={feedUpdatesPaused}
              replayMessageIndex={replayMessageIndex}
            />
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
