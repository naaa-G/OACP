import type { CoreMessageType, TaskStatus } from './message-types.js';

/** Common envelope fields on every OACP message. */
export interface OacpMessageEnvelope {
  type: CoreMessageType;
  version: string;
  message_id: string;
  trace_id: string;
  from: string;
  timestamp: string;
}

/** `task_request` message (`specs/messages/task_request.json`). */
export interface TaskRequestMessage extends OacpMessageEnvelope {
  type: 'task_request';
  capability: string;
  input: Record<string, unknown>;
  to?: string;
  deadline_ms?: number;
}

/** Structured error on failed tasks. */
export interface TaskErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** `task_response` message (`specs/messages/task_response.json`). */
export interface TaskResponseMessage extends OacpMessageEnvelope {
  type: 'task_response';
  in_reply_to: string;
  status: TaskStatus;
  output?: Record<string, unknown>;
  error?: TaskErrorBody;
}

/** `delegation` message (`specs/messages/delegation.json`). */
export interface DelegationMessage extends OacpMessageEnvelope {
  type: 'delegation';
  parent_message_id: string;
  capability: string;
  input: Record<string, unknown>;
  to?: string;
  reason?: string;
}

/** `capability_query` message (`specs/messages/capability_query.json`). */
export interface CapabilityQueryMessage extends OacpMessageEnvelope {
  type: 'capability_query';
  capability: string;
  limit?: number;
}

/** Union of all Day 2 core OACP messages. */
export type OacpMessage =
  | TaskRequestMessage
  | TaskResponseMessage
  | DelegationMessage
  | CapabilityQueryMessage;

/** Map message type discriminator to its typed message interface. */
export interface OacpMessageByType {
  task_request: TaskRequestMessage;
  task_response: TaskResponseMessage;
  delegation: DelegationMessage;
  capability_query: CapabilityQueryMessage;
}
