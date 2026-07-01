import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchSnapshot } from '../client.js';
import { SNAPSHOT_RECONCILE_INTERVAL_MS } from '../reconcile.js';
import { useObservabilityConfig } from '../provider.js';
import type { PlaygroundSnapshot } from '../types.js';

export const SNAPSHOT_QUERY_KEY = 'oacp-snapshot' as const;

export interface UseSnapshotOptions {
  readonly traceId?: string | undefined;
  readonly limit?: number | undefined;
  /** Poll interval in ms; `false` disables polling. May be a resolver for dynamic intervals. */
  readonly pollIntervalMs?:
    | number
    | false
    | ((snapshot: PlaygroundSnapshot | undefined) => number | false)
    | undefined;
  readonly enabled?: boolean | undefined;
  /** TanStack Query stale time; console uses `Infinity` to disable stale refetch loops. */
  readonly staleTime?: number | undefined;
  readonly refetchOnReconnect?: boolean | undefined;
}

export type UseSnapshotResult = UseQueryResult<PlaygroundSnapshot>;

/** Poll `GET /v1/observability/snapshot` with TanStack Query. */
export function useSnapshot(options: UseSnapshotOptions = {}): UseSnapshotResult {
  const config = useObservabilityConfig();
  const {
    traceId,
    limit = 25,
    pollIntervalMs = false,
    enabled = true,
    staleTime: staleTimeOption,
    refetchOnReconnect = true,
  } = options;

  const baseUrl = config.baseUrl ?? '';
  const snapshotPath = config.snapshotPath;
  const fetchImpl = config.fetchImpl;
  const apiKey = config.apiKey;

  const resolvePollInterval = (snapshot: PlaygroundSnapshot | undefined): number | false => {
    if (typeof pollIntervalMs === 'function') {
      return pollIntervalMs(snapshot);
    }

    return pollIntervalMs;
  };

  const staleTime = staleTimeOption ?? SNAPSHOT_RECONCILE_INTERVAL_MS;

  return useQuery({
    queryKey: [SNAPSHOT_QUERY_KEY, baseUrl, snapshotPath, traceId, limit],
    queryFn: ({ signal }) =>
      fetchSnapshot({
        baseUrl,
        traceId,
        limit,
        ...(snapshotPath !== undefined ? { snapshotPath } : {}),
        ...(fetchImpl !== undefined ? { fetchImpl } : {}),
        ...(apiKey !== undefined ? { apiKey } : {}),
        signal,
      }),
    enabled,
    refetchInterval: (query) => {
      const interval = resolvePollInterval(query.state.data);
      return interval === false ? false : interval;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect,
    placeholderData: keepPreviousData,
    staleTime,
    retry: false,
  });
}
