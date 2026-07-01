import {
  isSnapshotReconcileIntervalMs,
  SNAPSHOT_RECONCILE_INTERVAL_MS,
} from '@oacp/observability-client';
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'oacp.console.reconcileIntervalMs.v1';
const MIN_RECONCILE_MS = 1_000;
const MAX_RECONCILE_MS = 60_000;

function isValidReconcileIntervalMs(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_RECONCILE_MS && value <= MAX_RECONCILE_MS;
}

function readStoredInterval(): number {
  if (typeof window === 'undefined') {
    return SNAPSHOT_RECONCILE_INTERVAL_MS;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return SNAPSHOT_RECONCILE_INTERVAL_MS;
    }

    const parsed = Number.parseInt(raw, 10);
    if (isValidReconcileIntervalMs(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore storage failures.
  }

  return SNAPSHOT_RECONCILE_INTERVAL_MS;
}

function writeStoredInterval(intervalMs: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, String(intervalMs));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function useReconcileInterval(): {
  readonly reconcileIntervalMs: number;
  readonly setReconcileIntervalMs: (intervalMs: number) => void;
} {
  const [reconcileIntervalMs, setIntervalState] = useState<number>(() => readStoredInterval());

  const setReconcileIntervalMs = useCallback((intervalMs: number) => {
    const next = isSnapshotReconcileIntervalMs(intervalMs)
      ? intervalMs
      : SNAPSHOT_RECONCILE_INTERVAL_MS;
    setIntervalState(next);
    writeStoredInterval(next);
  }, []);

  return { reconcileIntervalMs, setReconcileIntervalMs };
}

export function resetReconcileIntervalForTests(): void {
  writeStoredInterval(SNAPSHOT_RECONCILE_INTERVAL_MS);
}
