import type { AgentIdentity } from '../protocol/agent-types.js';
import type { DelegationMessage, TaskRequestMessage } from '../protocol/message-schemas.js';
import type { InMemoryMessageBus } from '../routing/message-bus.js';
import type { SendOutcome } from '../routing/types.js';
import { decomposeAndExecute, executeSubtaskPlan } from '../workflow/execute-subtask-plan.js';
import type {
  DecomposeAndExecuteOptions,
  ExecuteSubtaskPlanOptions,
  SubtaskPlan,
  SubtaskPlanExecutionResult,
} from '../workflow/subtask-plan-types.js';
import type {
  DelegateParams,
  RuntimeHandle,
  SendTaskOutcome,
  SendTaskParams,
  TaskHandlerResult,
} from './types.js';

/** Per-task execution context exposed to `onTask` handlers. */
export class ExecutionContext {
  readonly agentId: string;
  readonly traceId: string;
  readonly messageId: string;
  readonly receivedAt: string;
  readonly request: TaskRequestMessage | DelegationMessage;

  constructor(
    private readonly runtime: RuntimeHandle,
    request: TaskRequestMessage | DelegationMessage,
    receivedAt: string,
  ) {
    this.agentId = runtime.identity.id;
    this.traceId = request.trace_id;
    this.messageId = request.message_id;
    this.receivedAt = receivedAt;
    this.request = request;
  }

  get identity(): AgentIdentity {
    return this.runtime.identity;
  }

  get bus(): InMemoryMessageBus {
    return this.runtime.bus;
  }

  get runtimeHandle(): RuntimeHandle {
    return this.runtime;
  }

  /** Send a `task_response` for the current task. */
  respond(result: TaskHandlerResult): Promise<SendOutcome> {
    return this.runtime.respond(this.request, result);
  }

  /** Delegate a subtask while preserving `trace_id`. */
  delegate(params: Omit<DelegateParams, 'parentMessageId' | 'traceId'>): Promise<SendOutcome> {
    return this.runtime.delegate({
      ...params,
      parentMessageId: this.request.message_id,
      traceId: this.request.trace_id,
    });
  }

  /** Run a downstream task and wait for `task_response` under the same `trace_id`. */
  sendSubTask(
    params: Omit<SendTaskParams, 'traceId' | 'parentMessageId'>,
  ): Promise<SendTaskOutcome> {
    return this.runtime.sendSubTask({
      ...params,
      traceId: this.request.trace_id,
      parentMessageId: this.request.message_id,
    });
  }

  /** Execute a pre-built subtask plan under the current `trace_id` (Day 17). */
  executePlan(
    plan: SubtaskPlan,
    options?: ExecuteSubtaskPlanOptions,
  ): Promise<SubtaskPlanExecutionResult> {
    return executeSubtaskPlan(this, plan, this.request.input, options);
  }

  /** Decompose the current task via a planner and execute the resulting plan (Day 17). */
  decomposeAndExecute(
    options: Omit<DecomposeAndExecuteOptions, 'planner'> & {
      readonly planner: DecomposeAndExecuteOptions['planner'];
    },
  ): Promise<SubtaskPlanExecutionResult> {
    return decomposeAndExecute(this, options);
  }
}
