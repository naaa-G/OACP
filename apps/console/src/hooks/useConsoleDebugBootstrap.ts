import { SNAPSHOT_QUERY_KEY, TRACE_GRAPH_QUERY_KEY } from '@oacp/observability-client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  consoleDebug,
  isConsoleDebugEnabled,
  logConsoleDebugBoot,
  registerConsoleDebugHelpers,
} from '../utils/console-debug.js';
import {
  getAllLastQueryFetchCauses,
  resolveQueryFetchCause,
  type ConsoleQueryTarget,
} from '../utils/console-query-debug.js';

function queryTargetFromKey(head: string): ConsoleQueryTarget | undefined {
  if (head === SNAPSHOT_QUERY_KEY) {
    return 'oacp-snapshot';
  }
  if (head === TRACE_GRAPH_QUERY_KEY) {
    return 'oacp-trace-graph';
  }
  return undefined;
}

function traceIdFromKey(head: string, key: readonly unknown[]): string | null {
  if (head === TRACE_GRAPH_QUERY_KEY) {
    const traceId = key[2];
    return typeof traceId === 'string' ? traceId : null;
  }
  if (head === SNAPSHOT_QUERY_KEY) {
    const traceId = key[3];
    return typeof traceId === 'string' ? traceId : null;
  }
  return null;
}

function fallbackFetchCause(
  target: ConsoleQueryTarget,
  query: { state: { fetchFailureCount: number; status: string } },
): { readonly cause: string; readonly source: string } {
  if (query.state.status === 'pending' && query.state.fetchFailureCount === 0) {
    return { cause: 'initial.mount', source: 'react-query' };
  }

  if (target === 'oacp-trace-graph') {
    return { cause: 'poll.interval-or-options', source: 'react-query' };
  }

  return { cause: 'poll.interval-or-invalidate', source: 'react-query' };
}

/** Subscribes to query cache + page lifecycle when debug mode is on. */
export function useConsoleDebugBootstrap(): void {
  const queryClient = useQueryClient();
  const renderCountRef = useRef(0);
  const fetchStatusRef = useRef(new Map<string, string>());

  renderCountRef.current += 1;

  useEffect(() => {
    if (!isConsoleDebugEnabled()) {
      return undefined;
    }

    registerConsoleDebugHelpers({
      lastFetchCauses: () => getAllLastQueryFetchCauses(),
    });

    logConsoleDebugBoot();

    const onBeforeUnload = (): void => {
      consoleDebug('page.beforeunload', { href: window.location.href });
    };

    const onVisibility = (): void => {
      consoleDebug('page.visibility', { hidden: document.hidden });
    };

    const onPageShow = (event: PageTransitionEvent): void => {
      consoleDebug('page.pageshow', { persisted: event.persisted });
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const rawKey: unknown = event.query.queryKey;
      const key: readonly unknown[] = Array.isArray(rawKey) ? rawKey : [rawKey];
      const head = String(key[0]);
      const target = queryTargetFromKey(head);
      if (target === undefined) {
        return;
      }

      const queryHash = event.query.queryHash;
      const prevFetchStatus = fetchStatusRef.current.get(queryHash) ?? 'idle';
      const nextFetchStatus = event.query.state.fetchStatus;
      fetchStatusRef.current.set(queryHash, nextFetchStatus);

      const traceId = traceIdFromKey(head, key);

      if (prevFetchStatus !== 'fetching' && nextFetchStatus === 'fetching') {
        const resolved = resolveQueryFetchCause(target, fallbackFetchCause(target, event.query));

        consoleDebug('query.fetchStart', {
          query: head,
          traceId,
          cause: resolved.cause,
          source: resolved.source,
          triggerEvent: event.type,
          status: event.query.state.status,
          ...resolved.detail,
        });
      }

      if (prevFetchStatus === 'fetching' && nextFetchStatus === 'idle') {
        const lastCause = getAllLastQueryFetchCauses()[target];
        consoleDebug('query.fetchDone', {
          query: head,
          traceId,
          cause: lastCause?.cause ?? 'unknown',
          source: lastCause?.source ?? 'unknown',
          status: event.query.state.status,
          error: event.query.state.error instanceof Error ? event.query.state.error.message : null,
        });
      }

      if (
        event.type === 'observerAdded' ||
        event.type === 'observerRemoved' ||
        event.type === 'observerOptionsUpdated'
      ) {
        consoleDebug('react-query.observer', {
          event: event.type,
          query: head,
          traceId,
          fetchStatus: nextFetchStatus,
          status: event.query.state.status,
          observerCount: event.query.getObserversCount(),
        });
      }
    });

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!isConsoleDebugEnabled()) {
      return;
    }

    if (renderCountRef.current <= 3 || renderCountRef.current % 25 === 0) {
      consoleDebug('layout.render', { count: renderCountRef.current });
    }
  });
}
