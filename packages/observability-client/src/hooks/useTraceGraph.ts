import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchTraceGraph } from '../client.js';
import { SNAPSHOT_RECONCILE_INTERVAL_MS } from '../reconcile.js';
import { useObservabilityConfig } from '../provider.js';
import type { TraceGraphView } from '../types.js';

export const TRACE_GRAPH_QUERY_KEY = 'oacp-trace-graph' as const;

export interface UseTraceGraphOptions {
  readonly traceId?: string | undefined;
  /** Poll interval in ms; `false` disables polling. */
  readonly pollIntervalMs?: number | false | undefined;
  readonly enabled?: boolean | undefined;
  readonly staleTime?: number | undefined;
}

export type UseTraceGraphResult = UseQueryResult<TraceGraphView>;

/** Poll `GET /v1/observability/traces/:traceId/graph` for Ops 2D layout (Day 27). */
export function useTraceGraph(options: UseTraceGraphOptions = {}): UseTraceGraphResult {
  const config = useObservabilityConfig();
  const { traceId, pollIntervalMs = false, enabled = true, staleTime: staleTimeOption } = options;

  const baseUrl = config.baseUrl ?? '';
  const fetchImpl = config.fetchImpl;
  const apiKey = config.apiKey;
  const isEnabled = enabled && traceId !== undefined && traceId.length > 0;
  const staleTime =
    staleTimeOption ?? (pollIntervalMs === false ? SNAPSHOT_RECONCILE_INTERVAL_MS : pollIntervalMs);

  return useQuery({
    queryKey: [TRACE_GRAPH_QUERY_KEY, baseUrl, traceId],
    queryFn: ({ signal }) => {
      if (traceId === undefined || traceId.length === 0) {
        throw new Error('useTraceGraph requires a non-empty traceId');
      }

      return fetchTraceGraph({
        baseUrl,
        traceId,
        ...(fetchImpl !== undefined ? { fetchImpl } : {}),
        ...(apiKey !== undefined ? { apiKey } : {}),
        signal,
      });
    },
    enabled: isEnabled,
    refetchInterval: pollIntervalMs === false ? false : pollIntervalMs,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
    staleTime,
    retry: false,
  });
}
