import {
  isRecentObservabilityTimestamp,
  SSE_CATCHUP_AGENT_THRESHOLD,
  SSE_CATCHUP_AGENT_WINDOW_MS,
  SSE_DEBOUNCED_RESYNC_MS,
  SSE_LIVE_MESSAGE_MAX_AGE_MS,
  SSE_REPLAY_IDLE_MS,
  SSE_REPLAY_MAX_MS,
  SNAPSHOT_QUERY_KEY,
  useObservabilityEvents,
} from '@oacp/observability-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { enqueueShowcaseEdgePulse } from '../graph/showcase-edge-pulse-bus.js';
import { enqueueMessageFeedAppend } from '../utils/message-feed-append-bus.js';
import { consoleDebug } from '../utils/console-debug.js';
import { noteQueryInvalidate } from '../utils/console-query-debug.js';

function eventMatchesSelectedTrace(
  selectedTraceId: string | undefined,
  eventTraceId: string | undefined,
): boolean {
  if (selectedTraceId === undefined || selectedTraceId.length === 0) {
    return true;
  }

  if (eventTraceId === undefined || eventTraceId.length === 0) {
    return true;
  }

  return eventTraceId === selectedTraceId;
}

/** Bridge SSE observability events to live feed, graph pulses, and debounced reconcile (Day 46 / 50). */
export function useObservabilitySseBridge({
  traceId,
  enabled,
}: {
  readonly traceId: string | undefined;
  readonly enabled: boolean;
}): void {
  const queryClient = useQueryClient();
  const debouncedResyncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const replaySettledRef = useRef(true);
  const replayBurstActiveRef = useRef(false);
  const replayIdleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const replayMaxTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const replayAgentCountRef = useRef(0);
  const catchUpBurstActiveRef = useRef(false);
  const catchUpIdleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const catchUpAgentWindowCountRef = useRef(0);
  const catchUpAgentWindowTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearDebouncedResync = useCallback(() => {
    if (debouncedResyncTimerRef.current !== undefined) {
      clearTimeout(debouncedResyncTimerRef.current);
      debouncedResyncTimerRef.current = undefined;
    }
  }, []);

  const finishCatchUpBurst = useCallback(() => {
    if (!catchUpBurstActiveRef.current) {
      return;
    }

    catchUpBurstActiveRef.current = false;
    catchUpAgentWindowCountRef.current = 0;

    if (catchUpIdleTimerRef.current !== undefined) {
      clearTimeout(catchUpIdleTimerRef.current);
      catchUpIdleTimerRef.current = undefined;
    }

    if (catchUpAgentWindowTimerRef.current !== undefined) {
      clearTimeout(catchUpAgentWindowTimerRef.current);
      catchUpAgentWindowTimerRef.current = undefined;
    }

    consoleDebug('sse.catchUpSettled', { traceId: traceId ?? null });
  }, [traceId]);

  const bumpCatchUpBurstIdle = useCallback(() => {
    if (!catchUpBurstActiveRef.current) {
      return;
    }

    if (catchUpIdleTimerRef.current !== undefined) {
      clearTimeout(catchUpIdleTimerRef.current);
    }

    catchUpIdleTimerRef.current = setTimeout(() => {
      catchUpIdleTimerRef.current = undefined;
      finishCatchUpBurst();
    }, SSE_REPLAY_IDLE_MS);
  }, [finishCatchUpBurst]);

  const beginCatchUpBurst = useCallback(() => {
    if (catchUpBurstActiveRef.current || replayBurstActiveRef.current) {
      return;
    }

    catchUpBurstActiveRef.current = true;
    clearDebouncedResync();
    consoleDebug('sse.catchUpBurst', {
      traceId: traceId ?? null,
      agentCount: catchUpAgentWindowCountRef.current,
    });
    bumpCatchUpBurstIdle();
  }, [bumpCatchUpBurstIdle, clearDebouncedResync, traceId]);

  const noteCatchUpAgentRegistered = useCallback(() => {
    if (replayBurstActiveRef.current || !replaySettledRef.current) {
      return;
    }

    catchUpAgentWindowCountRef.current += 1;

    if (catchUpAgentWindowTimerRef.current === undefined) {
      catchUpAgentWindowTimerRef.current = setTimeout(() => {
        catchUpAgentWindowTimerRef.current = undefined;
        catchUpAgentWindowCountRef.current = 0;
      }, SSE_CATCHUP_AGENT_WINDOW_MS);
    }

    if (catchUpAgentWindowCountRef.current >= SSE_CATCHUP_AGENT_THRESHOLD) {
      beginCatchUpBurst();
    }
  }, [beginCatchUpBurst]);

  const finishReplayBurst = useCallback((reason: 'idle' | 'max') => {
    if (!replayBurstActiveRef.current) {
      return;
    }

    replayBurstActiveRef.current = false;
    replaySettledRef.current = true;

    if (replayIdleTimerRef.current !== undefined) {
      clearTimeout(replayIdleTimerRef.current);
      replayIdleTimerRef.current = undefined;
    }

    if (replayMaxTimerRef.current !== undefined) {
      clearTimeout(replayMaxTimerRef.current);
      replayMaxTimerRef.current = undefined;
    }

    consoleDebug('sse.replaySettled', {
      reason,
      replayedAgents: replayAgentCountRef.current,
    });
    replayAgentCountRef.current = 0;
  }, []);

  const beginReplayBurst = useCallback(() => {
    replayBurstActiveRef.current = true;
    replaySettledRef.current = false;
    replayAgentCountRef.current = 0;

    if (replayMaxTimerRef.current !== undefined) {
      clearTimeout(replayMaxTimerRef.current);
    }

    consoleDebug('sse.connected', { idleMs: SSE_REPLAY_IDLE_MS, maxMs: SSE_REPLAY_MAX_MS });
    replayMaxTimerRef.current = setTimeout(() => {
      finishReplayBurst('max');
    }, SSE_REPLAY_MAX_MS);
  }, [finishReplayBurst]);

  const bumpReplayBurstIdle = useCallback(() => {
    if (!replayBurstActiveRef.current) {
      return;
    }

    if (replayIdleTimerRef.current !== undefined) {
      clearTimeout(replayIdleTimerRef.current);
    }

    replayIdleTimerRef.current = setTimeout(() => {
      replayIdleTimerRef.current = undefined;
      finishReplayBurst('idle');
    }, SSE_REPLAY_IDLE_MS);
  }, [finishReplayBurst]);

  const invalidateSnapshot = useCallback(
    (cause: string, detail: Record<string, unknown> = {}) => {
      noteQueryInvalidate('oacp-snapshot', cause, 'sse-bridge', detail);
      void queryClient.invalidateQueries({ queryKey: [SNAPSHOT_QUERY_KEY] });
    },
    [queryClient],
  );

  const scheduleDebouncedResync = useCallback(() => {
    if (!replaySettledRef.current) {
      consoleDebug('sse.debouncedResyncSkipped', { reason: 'replay' });
      return;
    }

    if (catchUpBurstActiveRef.current) {
      consoleDebug('sse.debouncedResyncSkipped', { reason: 'catch-up-burst' });
      return;
    }

    clearDebouncedResync();

    debouncedResyncTimerRef.current = setTimeout(() => {
      debouncedResyncTimerRef.current = undefined;
      consoleDebug('sse.debouncedResync', { delayMs: SSE_DEBOUNCED_RESYNC_MS });
      invalidateSnapshot('sse.debouncedResync', { delayMs: SSE_DEBOUNCED_RESYNC_MS });
    }, SSE_DEBOUNCED_RESYNC_MS);
  }, [clearDebouncedResync, invalidateSnapshot]);

  useEffect(() => {
    if (!enabled) {
      finishReplayBurst('idle');
    }
  }, [enabled, finishReplayBurst]);

  useEffect(() => {
    return () => {
      clearDebouncedResync();
      if (replayIdleTimerRef.current !== undefined) {
        clearTimeout(replayIdleTimerRef.current);
      }
      if (replayMaxTimerRef.current !== undefined) {
        clearTimeout(replayMaxTimerRef.current);
      }
      if (catchUpIdleTimerRef.current !== undefined) {
        clearTimeout(catchUpIdleTimerRef.current);
      }
      if (catchUpAgentWindowTimerRef.current !== undefined) {
        clearTimeout(catchUpAgentWindowTimerRef.current);
      }
    };
  }, [clearDebouncedResync]);

  const onResync = useCallback(() => {
    // Replayed `stream.resync` events arrive during the connect burst — force resync here
    // duplicates the initial snapshot fetch and invalidates trace-graph (Ops 2D flicker).
    if (replayBurstActiveRef.current || !replaySettledRef.current) {
      consoleDebug('sse.resyncSkipped', {
        reason: 'replay-burst-stream-resync',
        traceId: traceId ?? null,
      });
      return;
    }

    clearDebouncedResync();
    consoleDebug('sse.streamResync', { traceId: traceId ?? null });
    scheduleDebouncedResync();
  }, [clearDebouncedResync, scheduleDebouncedResync, traceId]);

  const onOpen = useCallback(() => {
    beginReplayBurst();
  }, [beginReplayBurst]);

  // Global SSE stream — stable across trace selection changes.
  useObservabilityEvents({
    enabled,
    onOpen,
    onResync,
    onEvent: (event) => {
      bumpReplayBurstIdle();
      bumpCatchUpBurstIdle();

      if (event.type === 'agent.registered' && replayBurstActiveRef.current) {
        replayAgentCountRef.current += 1;
        if (replayAgentCountRef.current === 1 || replayAgentCountRef.current % 10 === 0) {
          consoleDebug('sse.event', {
            type: event.type,
            traceId: traceId ?? null,
            replayBurst: true,
            replayAgentCount: replayAgentCountRef.current,
          });
        }
        return;
      }

      consoleDebug('sse.event', {
        type: event.type,
        traceId: traceId ?? null,
        replaySettled: replaySettledRef.current,
        eventTraceId: 'trace_id' in event.data ? event.data.trace_id : undefined,
      });

      switch (event.type) {
        case 'message.appended': {
          if (!eventMatchesSelectedTrace(traceId, event.data.trace_id)) {
            break;
          }

          if (replayBurstActiveRef.current || catchUpBurstActiveRef.current) {
            consoleDebug('sse.messageIgnored', {
              reason: catchUpBurstActiveRef.current ? 'catch-up-burst' : 'replay-burst',
              messageId: event.data.message_id,
            });
            break;
          }

          if (
            !isRecentObservabilityTimestamp(event.data.timestamp) ||
            !isRecentObservabilityTimestamp(event.timestamp)
          ) {
            consoleDebug('sse.messageIgnored', {
              reason: 'historical',
              messageId: event.data.message_id,
              timestamp: event.data.timestamp,
              maxAgeMs: SSE_LIVE_MESSAGE_MAX_AGE_MS,
            });
            break;
          }

          enqueueMessageFeedAppend(event.data);

          const targetAgent = event.data.to ?? event.data.recipients?.[0];
          if (targetAgent !== undefined && targetAgent.length > 0) {
            enqueueShowcaseEdgePulse({
              fromAgent: event.data.from,
              toAgent: targetAgent,
              messageId: event.data.message_id,
            });
          }

          scheduleDebouncedResync();
          break;
        }
        case 'agent.registered':
          noteCatchUpAgentRegistered();
          break;
        case 'trace.started':
        case 'trace.completed':
          consoleDebug('sse.traceLifecycleIgnored', {
            trigger: event.type,
            eventTraceId: 'trace_id' in event.data ? event.data.trace_id : undefined,
            replayBurst: replayBurstActiveRef.current,
          });
          break;
        default:
          break;
      }
    },
  });
}
