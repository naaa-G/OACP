/** Machine-readable runtime error codes for agent lifecycle and task execution. */
export const RUNTIME_ERROR_CODES = {
  NOT_STARTED: 'RUNTIME_NOT_STARTED',
  ALREADY_RUNNING: 'RUNTIME_ALREADY_RUNNING',
  ALREADY_STOPPED: 'RUNTIME_ALREADY_STOPPED',
  RESPONSE_TIMEOUT: 'RUNTIME_RESPONSE_TIMEOUT',
  SEND_FAILED: 'RUNTIME_SEND_FAILED',
  TASK_HANDLER_FAILED: 'RUNTIME_TASK_HANDLER_FAILED',
  INVALID_TASK_MESSAGE: 'RUNTIME_INVALID_TASK_MESSAGE',
  RECOVERY_EXHAUSTED: 'RUNTIME_RECOVERY_EXHAUSTED',
} as const;

export type RuntimeErrorCode = (typeof RUNTIME_ERROR_CODES)[keyof typeof RUNTIME_ERROR_CODES];

/** Structured runtime error for agent operations. */
export class OacpRuntimeError extends Error {
  readonly code: RuntimeErrorCode;
  readonly details: readonly { path: string; message: string }[];

  constructor(
    code: RuntimeErrorCode,
    message: string,
    details: readonly { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'OacpRuntimeError';
    this.code = code;
    this.details = details;
  }
}
