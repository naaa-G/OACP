import type { TraceListEntry } from '../types.js';
import { useSnapshot, type UseSnapshotOptions, type UseSnapshotResult } from './useSnapshot.js';

export type UseTracesResult = UseSnapshotResult & {
  readonly traces: readonly TraceListEntry[];
  readonly traceCount: number;
};

/** Trace list derived from the unified snapshot (single round trip). */
export function useTraces(options: UseSnapshotOptions = {}): UseTracesResult {
  const query = useSnapshot(options);

  return {
    ...query,
    traces: query.data?.traces ?? [],
    traceCount: query.data?.trace_count ?? 0,
  };
}
