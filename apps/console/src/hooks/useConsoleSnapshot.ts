import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  activeAgentsFromTrace,
  resolveConnectionStatus,
  snapshotStats,
  useSnapshot,
  type TraceListEntry,
  type UseSnapshotOptions,
} from '@oacp/observability-client';

import { useSelectionStore } from '../store/selection-store.js';
import { consoleDebug } from '../utils/console-debug.js';
import { getLastQueryFetchCause, noteQueryFetchCause } from '../utils/console-query-debug.js';

import {
  CONSOLE_SNAPSHOT_STALE_TIME_MS,
  resolveConsoleSnapshotPollIntervalMs,
} from '../config/console-observability-policy.js';
import { computeSnapshotStableHash } from '../utils/snapshot-poll.js';

export interface UseConsoleSnapshotOptions extends Omit<UseSnapshotOptions, 'pollIntervalMs'> {
  readonly syncUrl?: boolean | undefined;
  readonly liveEnabled?: boolean | undefined;
  readonly reconcileIntervalMs?: number | undefined;
}

export interface UseConsoleSnapshotResult {
  readonly selectedTraceId: string | undefined;
  readonly selectedAgentId: string | undefined;
  readonly detailAgentId: string | undefined;
  readonly selectTrace: (traceId: string) => void;
  readonly selectAgent: (agentId: string) => void;
  readonly handleAgentCardClick: (agentId: string) => void;
  readonly linkAgentSelection: (agentId: string) => void;
  readonly closeAgentDetail: () => void;
  readonly clearAgentSelection: () => void;
  readonly activeAgentIds: ReadonlySet<string>;
  readonly stats: ReturnType<typeof snapshotStats> | undefined;
  readonly traces: readonly TraceListEntry[];
  readonly data: ReturnType<typeof useSnapshot>['data'];
  readonly error: ReturnType<typeof useSnapshot>['error'];
  readonly isFetching: boolean;
  readonly isLoading: boolean;
  readonly isReconnecting: boolean;
  readonly isError: boolean;
  readonly refetch: ReturnType<typeof useSnapshot>['refetch'];
}

/**
 * Console observability state: snapshot polling, trace/agent selection (Zustand), URL deep links.
 * Selection survives poll refresh — store state is independent of React Query cache updates.
 */
export function useConsoleSnapshot(
  options: UseConsoleSnapshotOptions = {},
): UseConsoleSnapshotResult {
  const { syncUrl = true, liveEnabled = true, reconcileIntervalMs, ...snapshotOptions } = options;

  const selectedTraceId = useSelectionStore((state) => state.selectedTraceId);
  const selectedAgentId = useSelectionStore((state) => state.selectedAgentId);
  const detailAgentId = useSelectionStore((state) => state.detailAgentId);
  const hadUrlTraceOnMount = useSelectionStore((state) => state.hadUrlTraceOnMount);
  const autoSelectedTrace = useSelectionStore((state) => state.autoSelectedTrace);
  const selectTraceAction = useSelectionStore((state) => state.selectTrace);
  const selectAgentAction = useSelectionStore((state) => state.selectAgent);
  const setSelectedAgentAction = useSelectionStore((state) => state.setSelectedAgent);
  const openAgentDetail = useSelectionStore((state) => state.openAgentDetail);
  const closeAgentDetail = useSelectionStore((state) => state.closeAgentDetail);
  const clearAgentSelectionAction = useSelectionStore((state) => state.clearAgentSelection);
  const setSelectedTraceId = useSelectionStore((state) => state.setSelectedTraceId);
  const markAutoSelectedTrace = useSelectionStore((state) => state.markAutoSelectedTrace);
  const hydrateFromUrl = useSelectionStore((state) => state.hydrateFromUrl);
  const setSyncUrl = useSelectionStore((state) => state.setSyncUrl);

  useEffect(() => {
    setSyncUrl(syncUrl);
  }, [setSyncUrl, syncUrl]);

  const hadFetchFailureRef = useRef(false);
  const stableSnapshotRef = useRef<
    | {
        readonly hash: string;
        readonly data: NonNullable<ReturnType<typeof useSnapshot>['data']>;
      }
    | undefined
  >(undefined);

  const [snapshotPollIntervalMs, setSnapshotPollIntervalMs] = useState<number | false>(false);

  const query = useSnapshot({
    ...snapshotOptions,
    traceId: selectedTraceId,
    pollIntervalMs: snapshotPollIntervalMs,
    staleTime: CONSOLE_SNAPSHOT_STALE_TIME_MS,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const interval = resolveConsoleSnapshotPollIntervalMs({
      liveEnabled,
      reconcileIntervalMs: reconcileIntervalMs ?? 30_000,
      selectedTraceId,
      snapshot: query.data,
    });

    setSnapshotPollIntervalMs((previous) => (previous === interval ? previous : interval));

    consoleDebug('snapshot.pollInterval', {
      interval: interval === false ? 'disabled' : interval,
      selectedTraceId: selectedTraceId ?? null,
      traceStatus:
        query.data?.traces.find((trace) => trace.traceId === selectedTraceId)?.status ?? null,
    });
  }, [liveEnabled, query.data, reconcileIntervalMs, selectedTraceId]);

  const prevQueryRef = useRef<string>('');
  useEffect(() => {
    const signature = [
      query.status,
      query.fetchStatus,
      query.isFetching,
      query.isLoading,
      query.isSuccess,
      query.isError,
      selectedTraceId ?? '',
      query.dataUpdatedAt,
    ].join('|');
    if (signature === prevQueryRef.current) {
      return;
    }
    prevQueryRef.current = signature;
    consoleDebug('snapshot.query', {
      status: query.status,
      fetchStatus: query.fetchStatus,
      isFetching: query.isFetching,
      isLoading: query.isLoading,
      isSuccess: query.isSuccess,
      isError: query.isError,
      isBackgroundRefetch: query.isFetching && query.isSuccess,
      lastFetchCause: getLastQueryFetchCause('oacp-snapshot')?.cause ?? null,
      lastFetchSource: getLastQueryFetchCause('oacp-snapshot')?.source ?? null,
      selectedTraceId: selectedTraceId ?? null,
      traceCount: query.data?.trace_count ?? null,
      listedTraceIds: query.data?.traces.map((t) => t.traceId).slice(0, 5) ?? [],
      activeTraceId: query.data?.active_trace?.trace_id ?? null,
      error: query.error instanceof Error ? query.error.message : null,
    });
  }, [
    query.data?.active_trace?.trace_id,
    query.data?.trace_count,
    query.data?.traces,
    query.dataUpdatedAt,
    query.error,
    query.fetchStatus,
    query.isError,
    query.isFetching,
    query.isLoading,
    query.isSuccess,
    query.status,
    selectedTraceId,
  ]);

  // Hide React Query cache while in error — stale graph/feed confuses offline UX (Day 14).
  const snapshotDataRaw = query.isError ? undefined : query.data;
  const snapshotData = useMemo(() => {
    if (snapshotDataRaw === undefined) {
      stableSnapshotRef.current = undefined;
      return undefined;
    }

    const hash = computeSnapshotStableHash(snapshotDataRaw);
    if (stableSnapshotRef.current?.hash === hash) {
      return stableSnapshotRef.current.data;
    }

    stableSnapshotRef.current = { hash, data: snapshotDataRaw };
    return snapshotDataRaw;
  }, [snapshotDataRaw]);
  const isInitialLoading = query.isLoading && !query.isError;

  if (query.isError || query.failureCount > 0) {
    hadFetchFailureRef.current = true;
  }
  if (snapshotData !== undefined) {
    hadFetchFailureRef.current = false;
  }

  const connectionStatus = resolveConnectionStatus({
    isError: query.isError,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    hasSnapshot: snapshotData !== undefined,
  });
  const isReconnecting = connectionStatus === 'reconnecting' && hadFetchFailureRef.current;

  const selectTrace = useCallback(
    (traceId: string) => {
      selectTraceAction(traceId);
    },
    [selectTraceAction],
  );

  const selectAgent = useCallback(
    (agentId: string) => {
      selectAgentAction(agentId);
    },
    [selectAgentAction],
  );

  const handleAgentCardClick = useCallback(
    (agentId: string) => {
      if (selectedAgentId === agentId) {
        selectAgentAction(agentId);
        closeAgentDetail();
        return;
      }

      selectAgentAction(agentId);
      openAgentDetail(agentId);
    },
    [closeAgentDetail, openAgentDetail, selectAgentAction, selectedAgentId],
  );

  const linkAgentSelection = useCallback(
    (agentId: string) => {
      setSelectedAgentAction(agentId);
    },
    [setSelectedAgentAction],
  );

  const clearAgentSelection = useCallback(() => {
    clearAgentSelectionAction();
  }, [clearAgentSelectionAction]);

  // Auto-select most recent trace when no deep link was provided.
  useEffect(() => {
    if (hadUrlTraceOnMount || autoSelectedTrace || !query.isSuccess || snapshotData === undefined) {
      return;
    }

    if (snapshotData.traces.length === 0) {
      consoleDebug('trace.autoSelectSkipped', {
        reason: 'no-traces',
        traceCount: snapshotData.trace_count,
      });
      return;
    }

    const latestTraceId = snapshotData.traces[0]?.traceId;
    if (latestTraceId === undefined) {
      return;
    }

    markAutoSelectedTrace();
    consoleDebug('trace.autoSelect', { traceId: latestTraceId });
    setSelectedTraceId(latestTraceId);
  }, [
    autoSelectedTrace,
    hadUrlTraceOnMount,
    markAutoSelectedTrace,
    query.isSuccess,
    snapshotData,
    setSelectedTraceId,
  ]);

  // If the selected trace drops off the listing, fall back to the latest trace.
  useEffect(() => {
    if (!query.isSuccess || snapshotData?.traces === undefined || selectedTraceId === undefined) {
      return;
    }

    const stillListed = snapshotData.traces.some((trace) => trace.traceId === selectedTraceId);
    const activeMatches = snapshotData.active_trace?.trace_id === selectedTraceId;

    if (stillListed || activeMatches) {
      return;
    }

    consoleDebug('trace.staleReconcile', {
      selectedTraceId,
      stillListed,
      activeMatches,
      traceCount: snapshotData.trace_count,
      listedTraceIds: snapshotData.traces.map((t) => t.traceId),
      activeTraceId: snapshotData.active_trace?.trace_id ?? null,
    });

    const latestTraceId = snapshotData.traces[0]?.traceId;
    if (latestTraceId === undefined) {
      if (snapshotData.trace_count > 0) {
        return;
      }
      consoleDebug('trace.clear', { reason: 'not-listed-and-no-traces', selectedTraceId });
      setSelectedTraceId(undefined);
      return;
    }

    consoleDebug('trace.fallback', { from: selectedTraceId, to: latestTraceId });
    setSelectedTraceId(latestTraceId);
  }, [
    query.isSuccess,
    snapshotData?.active_trace?.trace_id,
    snapshotData?.trace_count,
    snapshotData?.traces,
    selectedTraceId,
    setSelectedTraceId,
  ]);

  useEffect(() => {
    consoleDebug('selection.state', {
      selectedTraceId: selectedTraceId ?? null,
      selectedAgentId: selectedAgentId ?? null,
      hadUrlTraceOnMount,
      autoSelectedTrace,
    });
  }, [autoSelectedTrace, hadUrlTraceOnMount, selectedAgentId, selectedTraceId]);

  // Browser back/forward without full reload.
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') {
      return;
    }

    const handlePopState = () => {
      hydrateFromUrl(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hydrateFromUrl, syncUrl]);

  // Clear agent selection when the agent is no longer in the registry (stale deep link).
  useEffect(() => {
    if (selectedAgentId === undefined || snapshotData?.agents === undefined) {
      return;
    }

    const stillRegistered = snapshotData.agents.some((agent) => agent.id === selectedAgentId);
    if (stillRegistered) {
      return;
    }

    useSelectionStore.getState().clearAgentSelection();
  }, [snapshotData?.agents, selectedAgentId]);

  useEffect(() => {
    if (detailAgentId === undefined || snapshotData?.agents === undefined) {
      return;
    }

    const stillRegistered = snapshotData.agents.some((agent) => agent.id === detailAgentId);
    if (stillRegistered) {
      return;
    }

    closeAgentDetail();
  }, [closeAgentDetail, detailAgentId, snapshotData?.agents]);

  const activeAgentIds = useMemo(
    () => activeAgentsFromTrace(snapshotData?.active_trace),
    [snapshotData?.active_trace],
  );

  const stats = snapshotData !== undefined ? snapshotStats(snapshotData) : undefined;

  const refetchWithDebug = useCallback(() => {
    noteQueryFetchCause('oacp-snapshot', 'manual.refresh', 'console-header');
    return query.refetch();
  }, [query]);

  return {
    selectedTraceId,
    selectedAgentId,
    detailAgentId,
    selectTrace,
    selectAgent,
    handleAgentCardClick,
    linkAgentSelection,
    closeAgentDetail,
    clearAgentSelection,
    activeAgentIds,
    stats,
    traces: snapshotData?.traces ?? [],
    data: snapshotData,
    error: query.error,
    isFetching: query.isFetching,
    isLoading: isInitialLoading,
    isReconnecting,
    isError: query.isError,
    refetch: refetchWithDebug,
  };
}
