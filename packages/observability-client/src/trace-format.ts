import type { TraceListEntry } from './types.js';

export type TraceDisplayStatus = 'running' | 'completed' | 'failed';

/** Compact trace id for dense UI rows (first segment of UUID or full id when short). */
export function shortTraceId(traceId: string): string {
  const trimmed = traceId.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  return `${trimmed.slice(0, 8)}…`;
}

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
  style: 'short',
});

const ABSOLUTE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** Human-readable relative or absolute timestamp for trace rows. */
export function formatTraceActivityTime(isoTimestamp: string, nowMs: number = Date.now()): string {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) {
    return '—';
  }

  const deltaMs = parsed - nowMs;
  const deltaMinutes = Math.round(deltaMs / 60_000);

  if (Math.abs(deltaMinutes) < 60) {
    return RELATIVE_TIME_FORMATTER.format(deltaMinutes, 'minute');
  }

  const deltaHours = Math.round(deltaMs / 3_600_000);
  if (Math.abs(deltaHours) < 48) {
    return RELATIVE_TIME_FORMATTER.format(deltaHours, 'hour');
  }

  return ABSOLUTE_TIME_FORMATTER.format(parsed);
}

export function traceDurationMs(trace: TraceListEntry): number | undefined {
  const started = Date.parse(trace.startedAt);
  const finished = Date.parse(trace.completedAt ?? trace.lastActivityAt);

  if (Number.isNaN(started) || Number.isNaN(finished) || finished < started) {
    return undefined;
  }

  return finished - started;
}

export function formatTraceDuration(trace: TraceListEntry): string {
  const durationMs = traceDurationMs(trace);
  if (durationMs === undefined) {
    return '—';
  }

  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  if (minutes < 60) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`;
}

export function resolveTraceDisplayStatus(trace: TraceListEntry): TraceDisplayStatus {
  if (trace.status === 'running' || trace.status === 'completed' || trace.status === 'failed') {
    return trace.status;
  }

  if (trace.messageTypes.some((type) => type.toLowerCase().includes('failed'))) {
    return 'failed';
  }

  if (trace.completedAt !== undefined) {
    return 'completed';
  }

  return 'running';
}

export function formatTraceStatusLabel(status: TraceDisplayStatus): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
  }
}

/** Secondary metadata line for trace rail rows. */
export function formatTraceListMeta(trace: TraceListEntry): string {
  const messageLabel = trace.messageCount === 1 ? 'msg' : 'msgs';
  const agentLabel = trace.agents.length === 1 ? 'agent' : 'agents';
  return `${trace.messageCount} ${messageLabel} · ${trace.agents.length} ${agentLabel} · ${formatTraceDuration(trace)}`;
}
