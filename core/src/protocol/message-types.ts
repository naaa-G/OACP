/** OACP message type discriminators for protocol v0.1. */
export const MESSAGE_TYPES = {
  TASK_REQUEST: 'task_request',
  TASK_RESPONSE: 'task_response',
  DELEGATION: 'delegation',
  CAPABILITY_QUERY: 'capability_query',
  MEMORY_SHARE: 'memory_share',
  HEARTBEAT: 'heartbeat',
} as const;

/** Message types defined in specs/messages/ for v0.1 (Day 2). */
export const CORE_MESSAGE_TYPES = [
  MESSAGE_TYPES.TASK_REQUEST,
  MESSAGE_TYPES.TASK_RESPONSE,
  MESSAGE_TYPES.DELEGATION,
  MESSAGE_TYPES.CAPABILITY_QUERY,
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export type CoreMessageType = (typeof CORE_MESSAGE_TYPES)[number];

/** Task outcome status for task_response messages. */
export const TASK_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

/** Relative paths to canonical JSON Schemas (within bundled `core/schemas/`). */
export const SCHEMA_PATHS = {
  BASE: 'oacp.schema.json',
  MESSAGES: {
    TASK_REQUEST: 'messages/task_request.json',
    TASK_RESPONSE: 'messages/task_response.json',
    DELEGATION: 'messages/delegation.json',
    CAPABILITY_QUERY: 'messages/capability_query.json',
  },
} as const;

/** Map message type → schema path for the four Day 2 message types. */
export const MESSAGE_TYPE_SCHEMA_PATH: Record<CoreMessageType, string> = {
  task_request: SCHEMA_PATHS.MESSAGES.TASK_REQUEST,
  task_response: SCHEMA_PATHS.MESSAGES.TASK_RESPONSE,
  delegation: SCHEMA_PATHS.MESSAGES.DELEGATION,
  capability_query: SCHEMA_PATHS.MESSAGES.CAPABILITY_QUERY,
};
