import type { MessageAppendedEventData, TraceTimelineEvent } from '@oacp/observability-client';
import {
  FEED_TAIL_LIMIT,
  mergeTimelineEventsAppendOnly,
  timelineEventFromMessageAppended,
} from '@oacp/observability-client';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  appendToMessageFeedPauseBuffer,
  flushMessageFeedPauseBuffer,
} from '../utils/message-feed-pause-buffer.js';
import { tailTimelineEventsForAgent } from '../utils/timeline-agent-filter.js';
import { subscribeMessageFeedAppend } from '../utils/message-feed-append-bus.js';

export interface UseIncrementalMessageFeedOptions {
  readonly timeline: readonly TraceTimelineEvent[] | undefined;
  readonly selectedTraceId: string | undefined;
  readonly selectedAgentId: string | undefined;
  readonly liveEnabled: boolean;
  readonly feedPaused?: boolean | undefined;
  readonly tailLimit?: number | undefined;
}

export interface UseIncrementalMessageFeedResult {
  readonly events: readonly TraceTimelineEvent[];
  readonly newMessageIds: ReadonlySet<string>;
  readonly bufferedCount: number;
}

function timelineEventMatchesAgentFilter(
  event: TraceTimelineEvent,
  agentId: string | undefined,
): boolean {
  if (agentId === undefined) {
    return true;
  }
  return event.from === agentId || event.to === agentId;
}

function appendSseEvent(
  rows: readonly TraceTimelineEvent[],
  data: MessageAppendedEventData,
  agentId: string | undefined,
  tailLimit: number,
): { rows: readonly TraceTimelineEvent[]; appendedId?: string } {
  if (data.trace_id.length === 0) {
    return { rows };
  }

  const event = timelineEventFromMessageAppended(data, rows.length);
  if (!timelineEventMatchesAgentFilter(event, agentId)) {
    return { rows };
  }

  const merged = mergeTimelineEventsAppendOnly(rows, [event], tailLimit);
  const appendedId = merged.appendedMessageIds[0];
  return appendedId !== undefined ? { rows: merged.rows, appendedId } : { rows };
}

/** Incremental message feed — append-by-message_id with SSE + poll reconcile (Day 47). */
export function useIncrementalMessageFeed({
  timeline,
  selectedTraceId,
  selectedAgentId,
  liveEnabled,
  feedPaused = false,
  tailLimit = FEED_TAIL_LIMIT,
}: UseIncrementalMessageFeedOptions): UseIncrementalMessageFeedResult {
  const [rows, setRows] = useState<readonly TraceTimelineEvent[]>([]);
  const [newMessageIds, setNewMessageIds] = useState<ReadonlySet<string>>(() => new Set());
  const [bufferedCount, setBufferedCount] = useState(0);
  const scopeKeyRef = useRef(`${selectedTraceId ?? ''}:${selectedAgentId ?? ''}`);
  const animatedIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const pauseBufferRef = useRef<TraceTimelineEvent[]>([]);
  const feedPausedRef = useRef(feedPaused);
  const rowsRef = useRef(rows);

  feedPausedRef.current = feedPaused;
  rowsRef.current = rows;

  const markAppended = useCallback((appendedIds: readonly string[], animate: boolean) => {
    if (appendedIds.length === 0) {
      return;
    }

    if (!animate) {
      for (const id of appendedIds) {
        animatedIdsRef.current.add(id);
      }
      return;
    }

    const fresh = appendedIds.filter((id) => !animatedIdsRef.current.has(id));
    if (fresh.length === 0) {
      return;
    }

    for (const id of fresh) {
      animatedIdsRef.current.add(id);
    }
    setNewMessageIds(new Set(fresh));
  }, []);

  const syncBufferedCount = useCallback(() => {
    setBufferedCount(pauseBufferRef.current.length);
  }, []);

  const bufferIncoming = useCallback(
    (incoming: readonly TraceTimelineEvent[]) => {
      pauseBufferRef.current = appendToMessageFeedPauseBuffer(
        pauseBufferRef.current,
        rowsRef.current,
        incoming,
      ) as TraceTimelineEvent[];
      syncBufferedCount();
    },
    [syncBufferedCount],
  );

  useEffect(() => {
    const scopeKey = `${selectedTraceId ?? ''}:${selectedAgentId ?? ''}`;
    if (scopeKeyRef.current !== scopeKey) {
      scopeKeyRef.current = scopeKey;
      initializedRef.current = false;
      animatedIdsRef.current = new Set();
      pauseBufferRef.current = [];
      setBufferedCount(0);
      setRows([]);
      setNewMessageIds(new Set());
    }
  }, [selectedAgentId, selectedTraceId]);

  useEffect(() => {
    if (selectedTraceId === undefined || timeline === undefined) {
      pauseBufferRef.current = [];
      setBufferedCount(0);
      setRows([]);
      setNewMessageIds(new Set());
      initializedRef.current = false;
      return;
    }

    const incoming = tailTimelineEventsForAgent(timeline, selectedAgentId, tailLimit);

    if (feedPausedRef.current) {
      bufferIncoming(incoming);
      return;
    }

    setRows((current) => {
      const merged = mergeTimelineEventsAppendOnly(current, incoming, tailLimit);
      const shouldAnimate = initializedRef.current && liveEnabled;
      markAppended(merged.appendedMessageIds, shouldAnimate);
      initializedRef.current = true;
      return merged.rows;
    });
  }, [
    bufferIncoming,
    liveEnabled,
    markAppended,
    selectedAgentId,
    selectedTraceId,
    tailLimit,
    timeline,
    feedPaused,
  ]);

  useEffect(() => {
    if (feedPaused || selectedTraceId === undefined) {
      return;
    }

    if (pauseBufferRef.current.length === 0) {
      return;
    }

    const buffered = pauseBufferRef.current;
    pauseBufferRef.current = [];
    setBufferedCount(0);

    setRows((current) => {
      const flushed = flushMessageFeedPauseBuffer(current, buffered, tailLimit);
      const shouldAnimate = initializedRef.current && liveEnabled;
      markAppended(flushed.appendedMessageIds, shouldAnimate);
      initializedRef.current = true;
      return flushed.rows;
    });
  }, [feedPaused, liveEnabled, markAppended, selectedTraceId, tailLimit]);

  useEffect(() => {
    if (!liveEnabled || selectedTraceId === undefined) {
      return undefined;
    }

    return subscribeMessageFeedAppend((data) => {
      if (data.trace_id !== selectedTraceId) {
        return;
      }

      if (feedPausedRef.current) {
        if (data.trace_id.length === 0) {
          return;
        }

        const event = timelineEventFromMessageAppended(data, rowsRef.current.length);
        if (!timelineEventMatchesAgentFilter(event, selectedAgentId)) {
          return;
        }

        pauseBufferRef.current = appendToMessageFeedPauseBuffer(
          pauseBufferRef.current,
          rowsRef.current,
          [event],
        ) as TraceTimelineEvent[];
        syncBufferedCount();
        return;
      }

      setRows((current) => {
        const result = appendSseEvent(current, data, selectedAgentId, tailLimit);
        if (result.appendedId !== undefined) {
          markAppended([result.appendedId], true);
        }
        return result.rows;
      });
    });
  }, [liveEnabled, markAppended, selectedAgentId, selectedTraceId, syncBufferedCount, tailLimit]);

  useEffect(() => {
    if (newMessageIds.size === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNewMessageIds(new Set());
    }, 600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [newMessageIds]);

  return { events: rows, newMessageIds, bufferedCount };
}
