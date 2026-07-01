/** Default snapshot reconcile interval when SSE is the primary live transport (Week 10). */
export const SNAPSHOT_RECONCILE_INTERVAL_MS = 30_000;

/** Debounce window for coalescing burst `message.appended` resyncs into one snapshot/graph fetch. */
export const SSE_DEBOUNCED_RESYNC_MS = 1_500;

/** Idle gap after the last replayed SSE event before treating the stream as live. */
export const SSE_REPLAY_IDLE_MS = 800;

/** Hard cap for the initial SSE replay burst (slow mobile links). */
export const SSE_REPLAY_MAX_MS = 10_000;

/**
 * Only `message.appended` events within this window trigger live feed append +
 * debounced snapshot resync. Older timestamps are historical replay/import noise.
 */
export const SSE_LIVE_MESSAGE_MAX_AGE_MS = 120_000;

/** Agent registrations within this window after connect replay trigger catch-up suppression. */
export const SSE_CATCHUP_AGENT_WINDOW_MS = 500;

/** Agent registration count that signals MCPLab/import catch-up rather than live traffic. */
export const SSE_CATCHUP_AGENT_THRESHOLD = 3;

export function isRecentObservabilityTimestamp(
  timestamp: string,
  maxAgeMs: number = SSE_LIVE_MESSAGE_MAX_AGE_MS,
  nowMs: number = Date.now(),
): boolean {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return true;
  }

  return nowMs - parsed <= maxAgeMs;
}

/** @deprecated Use {@link SSE_REPLAY_IDLE_MS} */
export const SSE_REPLAY_SETTLE_MS = SSE_REPLAY_IDLE_MS;

export const SNAPSHOT_RECONCILE_INTERVAL_OPTIONS = [
  { value: 15_000, label: '15s' },
  { value: SNAPSHOT_RECONCILE_INTERVAL_MS, label: '30s' },
  { value: 60_000, label: '60s' },
] as const;

export type SnapshotReconcileIntervalMs =
  (typeof SNAPSHOT_RECONCILE_INTERVAL_OPTIONS)[number]['value'];

export function isSnapshotReconcileIntervalMs(value: number): value is SnapshotReconcileIntervalMs {
  return SNAPSHOT_RECONCILE_INTERVAL_OPTIONS.some((option) => option.value === value);
}
