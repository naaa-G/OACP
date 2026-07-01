import type { PlaygroundSnapshot, TraceListEntry } from '@oacp/observability-client';
import { resolveTraceDisplayStatus } from '@oacp/observability-client';

/** Fingerprint snapshot payload fields that affect graph, agents, and trace rail UI. */
export function computeSnapshotStableHash(snapshot: PlaygroundSnapshot): string {
  const agents = snapshot.agents
    .map((agent) =>
      [agent.id, agent.status ?? '', agent.fleet ?? '', agent.role ?? '', agent.name].join(':'),
    )
    .sort()
    .join('|');

  const traces = snapshot.traces
    .map((trace) =>
      [
        trace.traceId,
        resolveTraceDisplayStatus(trace),
        trace.messageCount,
        trace.lastActivityAt,
      ].join(':'),
    )
    .join('|');

  const links = snapshot.agent_links
    .map((link) => [link.from_agent, link.to_agent, link.kind, link.message_count].join(':'))
    .sort()
    .join('|');

  const active = snapshot.active_trace
    ? [
        snapshot.active_trace.trace_id,
        snapshot.active_trace.message_count,
        snapshot.active_trace.timeline.length,
      ].join(':')
    : '';

  return `${snapshot.trace_count}::${agents}::${traces}::${links}::${active}`;
}

export function resolveSelectedTraceEntry(
  traces: readonly TraceListEntry[] | undefined,
  selectedTraceId: string | undefined,
): TraceListEntry | undefined {
  if (selectedTraceId === undefined || traces === undefined) {
    return undefined;
  }

  return traces.find((trace) => trace.traceId === selectedTraceId);
}

function isTraceFinishedInActiveBundle(
  snapshot: PlaygroundSnapshot | undefined,
  selectedTraceId: string | undefined,
): boolean {
  const active = snapshot?.active_trace;
  if (
    active === undefined ||
    selectedTraceId === undefined ||
    active.trace_id !== selectedTraceId ||
    active.timeline.length === 0
  ) {
    return false;
  }

  const last = active.timeline[active.timeline.length - 1];
  return last?.type === 'task_response';
}

/** Historical traces do not need reconcile polling — SSE + manual refresh cover live updates. */
export function shouldPollSnapshotForTrace(
  selectedTrace: TraceListEntry | undefined,
  options: {
    readonly snapshot?: PlaygroundSnapshot | undefined;
    readonly selectedTraceId?: string | undefined;
  } = {},
): boolean {
  if (selectedTrace !== undefined) {
    const displayStatus = resolveTraceDisplayStatus(selectedTrace);
    if (displayStatus === 'completed' || displayStatus === 'failed') {
      return false;
    }
  }

  if (isTraceFinishedInActiveBundle(options.snapshot, options.selectedTraceId)) {
    return false;
  }

  // Snapshot loaded but no trace selected yet — avoid idle 30s churn before auto-select.
  if (selectedTrace === undefined && options.snapshot !== undefined) {
    return false;
  }

  return true;
}

export function resolveSnapshotPollIntervalMs(input: {
  readonly liveEnabled: boolean;
  readonly reconcileIntervalMs: number;
  readonly selectedTraceId: string | undefined;
  readonly snapshot: PlaygroundSnapshot | undefined;
}): number | false {
  if (!input.liveEnabled) {
    return false;
  }

  // Never arm the 30s timer before the first snapshot — avoids a poll that outlives
  // completed historical traces when React Query evaluates refetchInterval early.
  if (input.snapshot === undefined) {
    return false;
  }

  const selected = resolveSelectedTraceEntry(input.snapshot.traces, input.selectedTraceId);
  if (
    !shouldPollSnapshotForTrace(selected, {
      snapshot: input.snapshot,
      selectedTraceId: input.selectedTraceId,
    })
  ) {
    return false;
  }

  return input.reconcileIntervalMs;
}
