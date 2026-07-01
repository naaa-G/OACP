import { useCallback, useSyncExternalStore } from 'react';

import {
  readTraceRailScope,
  writeTraceRailScope,
  type TraceRailScope,
} from '../utils/trace-rail-scope.js';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): TraceRailScope {
  return readTraceRailScope();
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function useTraceRailScope(): {
  readonly scope: TraceRailScope;
  readonly setScope: (scope: TraceRailScope) => void;
} {
  const scope = useSyncExternalStore(subscribe, getSnapshot, (): TraceRailScope => 'all');

  const setScope = useCallback((next: TraceRailScope) => {
    writeTraceRailScope(next);
    emitChange();
  }, []);

  return { scope, setScope };
}
