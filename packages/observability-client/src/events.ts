/** Canonical SSE event types for `GET /v1/observability/events` (Day 46). */
export const OBSERVABILITY_EVENT_TYPES = [
  'message.appended',
  'agent.registered',
  'trace.started',
  'trace.completed',
  'stream.resync',
  'stream.heartbeat',
] as const;

export type ObservabilityEventType = (typeof OBSERVABILITY_EVENT_TYPES)[number];

export const OBSERVABILITY_EVENTS_PATH = '/v1/observability/events';

export interface ObservabilityEventEnvelope<TType extends ObservabilityEventType, TData> {
  readonly id: string;
  readonly type: TType;
  readonly timestamp: string;
  readonly data: TData;
}

export interface MessageAppendedEventData {
  readonly trace_id: string;
  readonly message_id: string;
  readonly message_type: string;
  readonly from: string;
  readonly to?: string;
  readonly capability?: string;
  readonly recipients?: readonly string[];
  readonly status?: string;
  readonly timestamp: string;
}

export interface AgentRegisteredEventData {
  readonly agent_id: string;
  readonly name: string;
  readonly capabilities: readonly string[];
  readonly fleet?: string;
  readonly role?: string;
}

export interface TraceStartedEventData {
  readonly trace_id: string;
  readonly started_at: string;
  readonly root_message_id: string;
  readonly from: string;
}

export interface TraceCompletedEventData {
  readonly trace_id: string;
  readonly completed_at: string;
  readonly message_count: number;
  readonly status: 'success' | 'error';
  readonly completing_message_id: string;
}

export interface StreamResyncEventData {
  readonly reason: 'cursor_not_found' | 'server_restart';
  readonly after_event_id?: string;
  readonly trace_id?: string;
}

export type MessageAppendedEvent = ObservabilityEventEnvelope<
  'message.appended',
  MessageAppendedEventData
>;

export type AgentRegisteredEvent = ObservabilityEventEnvelope<
  'agent.registered',
  AgentRegisteredEventData
>;

export type TraceStartedEvent = ObservabilityEventEnvelope<'trace.started', TraceStartedEventData>;

export type TraceCompletedEvent = ObservabilityEventEnvelope<
  'trace.completed',
  TraceCompletedEventData
>;

export type StreamResyncEvent = ObservabilityEventEnvelope<'stream.resync', StreamResyncEventData>;

export type StreamHeartbeatEvent = ObservabilityEventEnvelope<
  'stream.heartbeat',
  { readonly ok: true }
>;

export type ObservabilityEvent =
  | MessageAppendedEvent
  | AgentRegisteredEvent
  | TraceStartedEvent
  | TraceCompletedEvent
  | StreamResyncEvent
  | StreamHeartbeatEvent;

export function isObservabilityEventType(value: string): value is ObservabilityEventType {
  return (OBSERVABILITY_EVENT_TYPES as readonly string[]).includes(value);
}

export function parseObservabilityEventPayload(
  eventType: string,
  payload: unknown,
): ObservabilityEvent | undefined {
  if (!isObservabilityEventType(eventType) || payload === null || typeof payload !== 'object') {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const id = record.id;
  const timestamp = record.timestamp;
  const data = record.data;

  if (
    typeof id !== 'string' ||
    typeof timestamp !== 'string' ||
    typeof data !== 'object' ||
    data === null
  ) {
    return undefined;
  }

  return {
    id,
    type: eventType,
    timestamp,
    data,
  } as ObservabilityEvent;
}
