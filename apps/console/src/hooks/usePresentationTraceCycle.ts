import { useEffect, useRef } from 'react';

import type { TraceListEntry } from '@oacp/observability-client';

export interface UsePresentationTraceCycleOptions {
  readonly enabled: boolean;
  readonly traces: readonly TraceListEntry[];
  readonly selectedTraceId: string | undefined;
  readonly onSelectTrace: (traceId: string) => void;
  readonly intervalMs?: number | undefined;
}

export function resolveNextPresentationTraceId(
  traces: readonly TraceListEntry[],
  selectedTraceId: string | undefined,
): string | undefined {
  if (traces.length <= 1) {
    return undefined;
  }

  const currentIndex = traces.findIndex((trace) => trace.traceId === selectedTraceId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  return traces[(safeIndex + 1) % traces.length]?.traceId;
}

/** Auto-advance traces during unattended presentation loops (Day 43). */
export function usePresentationTraceCycle({
  enabled,
  traces,
  selectedTraceId,
  onSelectTrace,
  intervalMs = 60_000,
}: UsePresentationTraceCycleOptions): void {
  const onSelectTraceRef = useRef(onSelectTrace);
  onSelectTraceRef.current = onSelectTrace;

  useEffect(() => {
    if (!enabled || traces.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const nextTraceId = resolveNextPresentationTraceId(traces, selectedTraceId);
      if (nextTraceId !== undefined) {
        onSelectTraceRef.current(nextTraceId);
      }
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, selectedTraceId, traces]);
}
