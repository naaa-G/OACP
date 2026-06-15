/** Machine-readable workflow error codes for subtask plan validation and execution. */
export const WORKFLOW_ERROR_CODES = {
  PLAN_INVALID: 'WORKFLOW_PLAN_INVALID',
  PLAN_CYCLE: 'WORKFLOW_PLAN_CYCLE',
  STEP_FAILED: 'WORKFLOW_STEP_FAILED',
  PLANNER_FAILED: 'WORKFLOW_PLANNER_FAILED',
  NOT_FOUND: 'WORKFLOW_NOT_FOUND',
  RUN_NOT_FOUND: 'WORKFLOW_RUN_NOT_FOUND',
} as const;

export type WorkflowErrorCode = (typeof WORKFLOW_ERROR_CODES)[keyof typeof WORKFLOW_ERROR_CODES];

/** Structured workflow error for plan decomposition and execution. */
export class OacpWorkflowError extends Error {
  readonly code: WorkflowErrorCode;
  readonly details: readonly { path: string; message: string }[];

  constructor(
    code: WorkflowErrorCode,
    message: string,
    details: readonly { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'OacpWorkflowError';
    this.code = code;
    this.details = details;
  }
}
