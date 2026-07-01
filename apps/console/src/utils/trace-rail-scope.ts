import type { TraceListEntry } from '@oacp/observability-client';

/** Trace rail scope — live traces only vs full synced history. */
export type TraceRailScope = 'all' | 'live';

const STORAGE_KEY = 'oacp.console.traceRailScope.v1';

export function isLiveTrace(trace: TraceListEntry): boolean {
  return trace.status === 'running';
}

export function filterTracesByScope(
  traces: readonly TraceListEntry[],
  scope: TraceRailScope,
): readonly TraceListEntry[] {
  if (scope === 'all') {
    return traces;
  }
  return traces.filter(isLiveTrace);
}

export function readTraceRailScope(): TraceRailScope {
  if (typeof sessionStorage === 'undefined') {
    return 'all';
  }

  const stored = sessionStorage.getItem(STORAGE_KEY);
  return stored === 'live' ? 'live' : 'all';
}

export function writeTraceRailScope(scope: TraceRailScope): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, scope);
}
