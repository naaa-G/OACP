import { describe, expect, it } from 'vitest';

import {
  isRecentObservabilityTimestamp,
  isSnapshotReconcileIntervalMs,
  SNAPSHOT_RECONCILE_INTERVAL_MS,
  SNAPSHOT_RECONCILE_INTERVAL_OPTIONS,
  SSE_LIVE_MESSAGE_MAX_AGE_MS,
} from './reconcile.js';

describe('snapshot reconcile intervals', () => {
  it('defaults to 30s for SSE-primary live mode', () => {
    expect(SNAPSHOT_RECONCILE_INTERVAL_MS).toBe(30_000);
  });

  it('exposes enterprise reconcile presets', () => {
    expect(SNAPSHOT_RECONCILE_INTERVAL_OPTIONS.map((option) => option.value)).toEqual([
      15_000, 30_000, 60_000,
    ]);
  });

  it('validates stored reconcile intervals', () => {
    expect(isSnapshotReconcileIntervalMs(30_000)).toBe(true);
    expect(isSnapshotReconcileIntervalMs(1500)).toBe(false);
  });
});

describe('isRecentObservabilityTimestamp', () => {
  const nowMs = Date.parse('2026-06-30T12:00:00.000Z');

  it('treats timestamps within the live window as recent', () => {
    expect(
      isRecentObservabilityTimestamp(
        '2026-06-30T11:59:30.000Z',
        SSE_LIVE_MESSAGE_MAX_AGE_MS,
        nowMs,
      ),
    ).toBe(true);
  });

  it('treats older timestamps as historical', () => {
    expect(
      isRecentObservabilityTimestamp(
        '2026-06-30T11:00:00.000Z',
        SSE_LIVE_MESSAGE_MAX_AGE_MS,
        nowMs,
      ),
    ).toBe(false);
  });

  it('accepts unparseable timestamps to avoid dropping live events', () => {
    expect(isRecentObservabilityTimestamp('not-a-date', SSE_LIVE_MESSAGE_MAX_AGE_MS, nowMs)).toBe(
      true,
    );
  });
});
