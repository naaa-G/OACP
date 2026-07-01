import { consoleDebug } from './console-debug.js';

export type ConsoleQueryTarget = 'oacp-snapshot' | 'oacp-trace-graph';

export interface QueryFetchCause {
  readonly cause: string;
  readonly source: string;
  readonly detail: Record<string, unknown>;
  readonly notedAtMs: number;
}

const CAUSE_TTL_MS = 10_000;
const pendingCauses = new Map<ConsoleQueryTarget, QueryFetchCause>();
const lastResolvedCauses = new Map<ConsoleQueryTarget, QueryFetchCause>();

/** Tag the next fetch for a query — call immediately before invalidate/refetch. */
export function noteQueryFetchCause(
  target: ConsoleQueryTarget,
  cause: string,
  source: string,
  detail: Record<string, unknown> = {},
): void {
  const entry: QueryFetchCause = {
    cause,
    source,
    detail,
    notedAtMs: Date.now(),
  };

  pendingCauses.set(target, entry);

  consoleDebug('query.fetchScheduled', {
    target,
    cause,
    source,
    ...detail,
  });
}

export function noteQueryInvalidate(
  target: ConsoleQueryTarget,
  cause: string,
  source: string,
  detail: Record<string, unknown> = {},
): void {
  noteQueryFetchCause(target, cause, source, detail);
  consoleDebug('query.invalidate', {
    target,
    cause,
    source,
    ...detail,
  });
}

/** Resolve why a query fetch started; falls back when no recent note exists. */
export function resolveQueryFetchCause(
  target: ConsoleQueryTarget,
  fallback: { readonly cause: string; readonly source: string },
): QueryFetchCause {
  const pending = pendingCauses.get(target);
  const now = Date.now();

  if (pending !== undefined && now - pending.notedAtMs <= CAUSE_TTL_MS) {
    pendingCauses.delete(target);
    lastResolvedCauses.set(target, pending);
    return pending;
  }

  const resolved: QueryFetchCause = {
    cause: fallback.cause,
    source: fallback.source,
    detail: {},
    notedAtMs: now,
  };
  lastResolvedCauses.set(target, resolved);
  return resolved;
}

export function getLastQueryFetchCause(target: ConsoleQueryTarget): QueryFetchCause | undefined {
  return lastResolvedCauses.get(target);
}

export function getAllLastQueryFetchCauses(): Readonly<Record<string, QueryFetchCause>> {
  return Object.fromEntries(lastResolvedCauses.entries());
}
