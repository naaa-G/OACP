import type { TraceTimelineEvent } from '@oacp/observability-client';

export interface TimelineEventCorrelationIds {
  readonly message_id: string;
  readonly trace_id?: string | undefined;
  readonly timeline_index: number;
}

export function timelineEventLatencyMs(
  event: TraceTimelineEvent,
  previous: TraceTimelineEvent | undefined,
): number | undefined {
  if (previous === undefined) {
    return undefined;
  }

  const currentMs = Date.parse(event.timestamp);
  const previousMs = Date.parse(previous.timestamp);
  if (Number.isNaN(currentMs) || Number.isNaN(previousMs)) {
    return undefined;
  }

  const delta = currentMs - previousMs;
  return delta >= 0 ? delta : undefined;
}

export function formatTimelineEventLatency(latencyMs: number | undefined): string {
  if (latencyMs === undefined) {
    return '—';
  }
  if (latencyMs < 1000) {
    return `${latencyMs} ms`;
  }
  return `${(latencyMs / 1000).toFixed(2)} s`;
}

export function timelineEventCorrelationIds(
  event: TraceTimelineEvent,
  traceId: string | undefined,
): TimelineEventCorrelationIds {
  return {
    message_id: event.message_id,
    ...(traceId !== undefined && traceId.length > 0 ? { trace_id: traceId } : {}),
    timeline_index: event.index,
  };
}

export function timelineEventDetailPayload(
  event: TraceTimelineEvent,
  traceId: string | undefined,
  previous: TraceTimelineEvent | undefined,
): Record<string, unknown> {
  const latencyMs = timelineEventLatencyMs(event, previous);

  return {
    correlation: timelineEventCorrelationIds(event, traceId),
    ...(latencyMs !== undefined ? { latency_ms: latencyMs } : {}),
    event,
  };
}

export function timelineEventDetailJson(
  event: TraceTimelineEvent,
  traceId: string | undefined,
  previous: TraceTimelineEvent | undefined,
): string {
  return JSON.stringify(timelineEventDetailPayload(event, traceId, previous), null, 2);
}
