import type { AgentIdentity } from '../protocol/agent-types.js';
import type {
  DelegationMessage,
  TaskErrorBody,
  TaskRequestMessage,
  TaskResponseMessage,
} from '../protocol/message-schemas.js';
import type { TaskStatus } from '../protocol/message-types.js';
import type { InMemoryMessageBus } from '../routing/message-bus.js';
import type { OacpRoutingError } from '../routing/errors.js';
import type { OacpValidationError } from '../protocol/errors.js';
import type { SendOutcome } from '../routing/types.js';
import type { OacpRuntimeError } from './errors.js';
import type {
  ExecuteSubtaskPlanOptions,
  SubtaskPlan,
  SubtaskPlanExecutionResult,
  DecomposeAndExecuteOptions,
  SubtaskPlanner,
} from '../workflow/subtask-plan-types.js';

/** Result returned by an agent task handler. */
export interface TaskHandlerResult {
  readonly status?: TaskStatus;
  readonly output?: Record<string, unknown>;
  readonly error?: TaskErrorBody;
}

/** Narrow context surface passed to task handlers. */
export interface TaskExecutionContext {
  readonly agentId: string;
  readonly traceId: string;
  readonly messageId: string;
  readonly receivedAt: string;
  readonly request: TaskRequestMessage | DelegationMessage;
  /** Underlying runtime for advanced APIs such as resilient routing (Day 19). */
  readonly runtimeHandle: RuntimeHandle;
  respond(result: TaskHandlerResult): Promise<SendOutcome>;
  delegate(params: Omit<DelegateParams, 'parentMessageId' | 'traceId'>): Promise<SendOutcome>;
  /** Invoke a downstream task preserving the current `trace_id`. */
  sendSubTask(
    params: Omit<SendTaskParams, 'traceId' | 'parentMessageId'>,
  ): Promise<SendTaskOutcome>;
  /** Execute a validated subtask plan via `sendSubTask` (Day 17). */
  executePlan(
    plan: SubtaskPlan,
    options?: ExecuteSubtaskPlanOptions,
  ): Promise<SubtaskPlanExecutionResult>;
  /** Plan and execute subtasks from the current task input (Day 17). */
  decomposeAndExecute(
    options: Omit<DecomposeAndExecuteOptions, 'planner'> & { readonly planner: SubtaskPlanner },
  ): Promise<SubtaskPlanExecutionResult>;
}

/** Handler invoked for incoming `task_request` or `delegation` messages. */
export type TaskHandler = (
  request: TaskRequestMessage | DelegationMessage,
  context: TaskExecutionContext,
) => Promise<TaskHandlerResult> | TaskHandlerResult;

/** Parameters for `sendTask()`. */
export interface SendTaskParams {
  readonly capability: string;
  readonly input: Record<string, unknown>;
  readonly to?: string;
  readonly deadline_ms?: number;
  readonly traceId?: string;
  /**
   * Parent `message_id` for `sendSubTask` chains (Day 16 delegation graph).
   * Not part of the protocol envelope; recorded in memory and graph metadata.
   */
  readonly parentMessageId?: string;
  /** Wait for matching `task_response` (default: `true`). */
  readonly waitForResponse?: boolean;
  readonly timeoutMs?: number;
}

/** Parameters for `delegate()`. */
export interface DelegateParams {
  readonly capability: string;
  readonly input: Record<string, unknown>;
  readonly parentMessageId: string;
  readonly traceId: string;
  readonly to?: string;
  readonly reason?: string;
}

/** Narrow runtime surface used by `ExecutionContext`. */
export interface RuntimeHandle {
  readonly identity: AgentIdentity;
  readonly bus: InMemoryMessageBus;
  respond(
    request: TaskRequestMessage | DelegationMessage,
    result: TaskHandlerResult,
  ): Promise<SendOutcome>;
  delegate(params: DelegateParams): Promise<SendOutcome>;
  sendSubTask(params: SendTaskParams): Promise<SendTaskOutcome>;
}

export interface SendTaskSuccess {
  readonly ok: true;
  readonly request: TaskRequestMessage;
  readonly response?: TaskResponseMessage;
}

export interface SendTaskFailure {
  readonly ok: false;
  readonly error: OacpValidationError | OacpRoutingError | OacpRuntimeError;
}

export type SendTaskOutcome = SendTaskSuccess | SendTaskFailure;
