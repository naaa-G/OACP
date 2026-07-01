import type { PlaygroundSnapshot } from '@oacp/observability-client';

import { resolveSnapshotPollIntervalMs } from '../utils/snapshot-poll.js';

/**
 * Console observability transport policy (enterprise / production default).
 *
 * - One snapshot fetch on load (+ manual Refresh).
 * - SSE delivers live message deltas.
 * - No periodic stale refetch loop (React Query staleTime = ∞).
 * - Interval reconcile applies only to actively running traces.
 */

/** Prevent React Query from treating snapshot data as stale every 30s (root cause of background refetch flicker). */
export const CONSOLE_SNAPSHOT_STALE_TIME_MS = Number.POSITIVE_INFINITY;

export const CONSOLE_TRACE_GRAPH_STALE_TIME_MS = Number.POSITIVE_INFINITY;

export function resolveConsoleSnapshotPollIntervalMs(input: {
  readonly liveEnabled: boolean;
  readonly reconcileIntervalMs: number;
  readonly selectedTraceId: string | undefined;
  readonly snapshot: PlaygroundSnapshot | undefined;
}): number | false {
  return resolveSnapshotPollIntervalMs(input);
}
