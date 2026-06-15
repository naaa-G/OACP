import { PROTOCOL_VERSION } from '../protocol/constants.js';
import type {
  DelegationMessage,
  TaskErrorBody,
  TaskRequestMessage,
  TaskResponseMessage,
} from '../protocol/message-schemas.js';
import type { TaskStatus } from '../protocol/message-types.js';

/** Generate a RFC 4122 UUID v4 message identifier. */
export function createMessageId(): string {
  return crypto.randomUUID();
}

/** Generate a new trace identifier for correlated message flows. */
export function createTraceId(): string {
  return crypto.randomUUID();
}

export interface BuildTaskRequestParams {
  readonly from: string;
  readonly capability: string;
  readonly input: Record<string, unknown>;
  readonly traceId?: string;
  readonly messageId?: string;
  readonly to?: string;
  readonly deadline_ms?: number;
}

/** Build a validated-ready `task_request` envelope. */
export function buildTaskRequest(params: BuildTaskRequestParams): TaskRequestMessage {
  return {
    type: 'task_request',
    version: PROTOCOL_VERSION,
    message_id: params.messageId ?? createMessageId(),
    trace_id: params.traceId ?? createTraceId(),
    from: params.from,
    timestamp: new Date().toISOString(),
    capability: params.capability,
    input: params.input,
    ...(params.to !== undefined ? { to: params.to } : {}),
    ...(params.deadline_ms !== undefined ? { deadline_ms: params.deadline_ms } : {}),
  };
}

export interface BuildTaskResponseParams {
  readonly from: string;
  readonly inReplyTo: string;
  readonly traceId: string;
  readonly status: TaskStatus;
  readonly output?: Record<string, unknown>;
  readonly error?: TaskErrorBody;
  readonly messageId?: string;
}

/** Build a validated-ready `task_response` envelope. */
export function buildTaskResponse(params: BuildTaskResponseParams): TaskResponseMessage {
  return {
    type: 'task_response',
    version: PROTOCOL_VERSION,
    message_id: params.messageId ?? createMessageId(),
    trace_id: params.traceId,
    from: params.from,
    timestamp: new Date().toISOString(),
    in_reply_to: params.inReplyTo,
    status: params.status,
    ...(params.output !== undefined ? { output: params.output } : {}),
    ...(params.error !== undefined ? { error: params.error } : {}),
  };
}

export interface BuildDelegationParams {
  readonly from: string;
  readonly parentMessageId: string;
  readonly capability: string;
  readonly input: Record<string, unknown>;
  readonly traceId: string;
  readonly to?: string;
  readonly reason?: string;
  readonly messageId?: string;
}

/** Build a validated-ready `delegation` envelope. */
export function buildDelegation(params: BuildDelegationParams): DelegationMessage {
  return {
    type: 'delegation',
    version: PROTOCOL_VERSION,
    message_id: params.messageId ?? createMessageId(),
    trace_id: params.traceId,
    from: params.from,
    timestamp: new Date().toISOString(),
    parent_message_id: params.parentMessageId,
    capability: params.capability,
    input: params.input,
    ...(params.to !== undefined ? { to: params.to } : {}),
    ...(params.reason !== undefined ? { reason: params.reason } : {}),
  };
}
