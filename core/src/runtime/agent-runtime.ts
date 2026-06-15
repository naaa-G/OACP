import type { AgentIdentity } from '../protocol/agent-types.js';
import { assertValid } from '../protocol/errors.js';
import type {
  DelegationMessage,
  OacpMessage,
  TaskRequestMessage,
  TaskResponseMessage,
} from '../protocol/message-schemas.js';
import { validateAgentIdentity } from '../protocol/agent-identity.js';
import type { InMemoryMessageBus } from '../routing/message-bus.js';
import type { DeliveryContext } from '../routing/types.js';
import type { SendOutcome } from '../routing/types.js';
import type { DelegationGraphRecorder } from '../memory/delegation-graph-recorder.js';
import type { RecordDelegationMessageOptions } from '../memory/delegation-graph-types.js';
import type { TaskMemoryRecorder } from '../memory/task-recorder.js';
import { noopLogger, type OacpLogger } from '../observability/logger.js';
import { ExecutionContext } from './execution-context.js';
import { RUNTIME_ERROR_CODES, OacpRuntimeError } from './errors.js';
import {
  sendTaskWithRecovery,
  type ResilientSendTaskOutcome,
  type SendTaskWithRecoveryOptions,
} from '../resilience/resilient-send.js';
import { AGENT_LIFECYCLE_STATES, type AgentLifecycleState, canTransition } from './lifecycle.js';
import { buildDelegation, buildTaskRequest, buildTaskResponse } from './message-factory.js';
import type {
  DelegateParams,
  RuntimeHandle,
  SendTaskOutcome,
  SendTaskParams,
  TaskHandler,
  TaskHandlerResult,
} from './types.js';

export interface AgentRuntimeOptions {
  readonly identity: AgentIdentity;
  readonly bus: InMemoryMessageBus;
  readonly onTask?: TaskHandler;
  /** Automatically invoke `onTask` and respond (default: `true` when `onTask` is set). */
  readonly autoHandleTasks?: boolean;
  /** Enable pull-based `receiveTask()` via bus mailbox (default: `!autoHandleTasks`). */
  readonly useMailbox?: boolean;
  readonly defaultResponseTimeoutMs?: number;
  /** Optional task-history recorder (Day 15 persistent memory). */
  readonly taskRecorder?: TaskMemoryRecorder;
  /** Optional delegation graph recorder (Day 16). */
  readonly delegationGraphRecorder?: DelegationGraphRecorder;
  /** Memory scope override for this agent's recordings. */
  readonly memoryScope?: string;
  /** Structured logger for task lifecycle events (Day 20 observability). */
  readonly logger?: OacpLogger;
}

interface PendingResponse {
  readonly resolve: (response: TaskResponseMessage) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Enterprise-grade in-process agent runtime.
 * Registers on the message bus, handles tasks, and correlates responses by `trace_id`.
 */
export class AgentRuntime implements RuntimeHandle {
  readonly identity: AgentIdentity;
  readonly bus: InMemoryMessageBus;

  private readonly onTask: TaskHandler | undefined;
  private readonly autoHandleTasks: boolean;
  private readonly useMailbox: boolean;
  private readonly defaultResponseTimeoutMs: number;
  private readonly taskRecorder: TaskMemoryRecorder | undefined;
  private readonly delegationGraphRecorder: DelegationGraphRecorder | undefined;
  private readonly memoryScope: string | undefined;
  private readonly logger: OacpLogger;
  private state: AgentLifecycleState = AGENT_LIFECYCLE_STATES.CREATED;
  private readonly pendingResponses = new Map<string, PendingResponse>();
  private readonly pendingGraphContext = new Map<string, RecordDelegationMessageOptions>();

  constructor(options: AgentRuntimeOptions) {
    this.identity = options.identity;
    this.bus = options.bus;
    this.onTask = options.onTask;
    const autoHandle = options.autoHandleTasks ?? options.onTask !== undefined;
    this.autoHandleTasks = autoHandle;
    this.useMailbox = options.useMailbox ?? !autoHandle;
    this.defaultResponseTimeoutMs = options.defaultResponseTimeoutMs ?? 30_000;
    this.taskRecorder = options.taskRecorder;
    this.delegationGraphRecorder = options.delegationGraphRecorder;
    this.memoryScope = options.memoryScope;
    this.logger = (options.logger ?? noopLogger).child({ agent_id: options.identity.id });
  }

  get lifecycleState(): AgentLifecycleState {
    return this.state;
  }

  get isRunning(): boolean {
    return this.state === AGENT_LIFECYCLE_STATES.RUNNING;
  }

  /** Validate identity and register on the message bus. */
  start(): void {
    this.assertTransition(AGENT_LIFECYCLE_STATES.RUNNING);

    const identityOutcome = validateAgentIdentity(this.identity);
    assertValid(identityOutcome);

    this.bus.register(
      this.identity.id,
      (message, context) => this.handleIncoming(message, context),
      {
        capabilities: this.identity.capabilities,
        useMailbox: this.useMailbox,
      },
    );

    this.state = AGENT_LIFECYCLE_STATES.RUNNING;
  }

  /** Deregister from the bus and reject pending response waiters. */
  stop(): void {
    if (this.state === AGENT_LIFECYCLE_STATES.STOPPED) {
      return;
    }
    if (this.state !== AGENT_LIFECYCLE_STATES.RUNNING) {
      throw new OacpRuntimeError(
        RUNTIME_ERROR_CODES.NOT_STARTED,
        `Agent "${this.identity.id}" is not running`,
      );
    }

    this.bus.unregister(this.identity.id);
    this.clearPendingResponses();
    this.state = AGENT_LIFECYCLE_STATES.STOPPED;
  }

  /**
   * Send a `task_request` and optionally wait for the correlated `task_response`.
   */
  async sendTask(params: SendTaskParams): Promise<SendTaskOutcome> {
    this.assertRunning();

    const waitForResponse = params.waitForResponse ?? true;
    const request = buildTaskRequest({
      from: this.identity.id,
      capability: params.capability,
      input: params.input,
      ...(params.traceId !== undefined ? { traceId: params.traceId } : {}),
      ...(params.to !== undefined ? { to: params.to } : {}),
      ...(params.deadline_ms !== undefined ? { deadline_ms: params.deadline_ms } : {}),
    });

    const timeoutMs = params.timeoutMs ?? this.defaultResponseTimeoutMs;
    const responsePromise = waitForResponse
      ? this.createResponsePromise(request.message_id, timeoutMs)
      : undefined;

    if (params.parentMessageId !== undefined) {
      this.pendingGraphContext.set(request.message_id, {
        parentMessageId: params.parentMessageId,
      });
    }

    const sendOutcome = await this.bus.send(request);
    if (!sendOutcome.ok) {
      this.pendingGraphContext.delete(request.message_id);
      if (waitForResponse) {
        this.cancelResponseWait(request.message_id);
      }
      this.logger.warn('sendTask failed', {
        trace_id: request.trace_id,
        message_id: request.message_id,
        capability: params.capability,
        error: sendOutcome.error.message,
      });
      return { ok: false, error: sendOutcome.error };
    }

    this.logger.info('sendTask dispatched', {
      trace_id: request.trace_id,
      message_id: request.message_id,
      message_type: 'task_request',
      capability: params.capability,
      ...(params.to !== undefined ? { to: params.to } : {}),
    });

    await this.persistMessage(request);

    if (!waitForResponse || !responsePromise) {
      return { ok: true, request };
    }

    const response = await responsePromise;
    if (!response) {
      return {
        ok: false,
        error: new OacpRuntimeError(
          RUNTIME_ERROR_CODES.RESPONSE_TIMEOUT,
          `Timed out waiting for task_response to "${request.message_id}"`,
          [{ path: '/in_reply_to', message: `No response within timeout` }],
        ),
      };
    }

    await this.persistMessage(response);

    return { ok: true, request, response };
  }

  /**
   * Pull the next `task_request` or `delegation` from the agent mailbox.
   * Requires `useMailbox: true` and `autoHandleTasks: false`.
   */
  async receiveTask(
    timeoutMs = 30_000,
  ): Promise<TaskRequestMessage | DelegationMessage | undefined> {
    this.assertRunning();

    const message = await this.bus.waitForMessage(this.identity.id, timeoutMs);
    if (!message) {
      return undefined;
    }

    if (message.type === 'task_request' || message.type === 'delegation') {
      return message;
    }

    throw new OacpRuntimeError(
      RUNTIME_ERROR_CODES.INVALID_TASK_MESSAGE,
      `Expected task_request or delegation but received "${message.type}"`,
      [{ path: '/type', message: `Unexpected message type: ${message.type}` }],
    );
  }

  /** Send a `task_response` for a handled task. */
  async respond(
    request: TaskRequestMessage | DelegationMessage,
    result: TaskHandlerResult,
  ): Promise<SendOutcome> {
    this.assertRunning();

    const status = result.status ?? (result.error ? 'error' : 'success');
    const response = buildTaskResponse({
      from: this.identity.id,
      inReplyTo: request.message_id,
      traceId: request.trace_id,
      status,
      ...(result.output !== undefined ? { output: result.output } : {}),
      ...(result.error !== undefined ? { error: result.error } : {}),
    });

    const outcome = await this.bus.send(response);
    if (outcome.ok) {
      await this.persistMessage(response);
    }
    return outcome;
  }

  /**
   * Invoke a downstream task preserving an explicit `trace_id`.
   * Used by pipeline agents to chain A → B → C without losing correlation.
   */
  async sendSubTask(params: SendTaskParams): Promise<SendTaskOutcome> {
    return this.sendTask(params);
  }

  /**
   * Send a task with alternate-agent failover and optional retries (Day 19).
   */
  async sendTaskWithRecovery(
    params: SendTaskParams,
    options?: SendTaskWithRecoveryOptions,
  ): Promise<ResilientSendTaskOutcome> {
    this.assertRunning();
    return sendTaskWithRecovery(this, params, options);
  }

  /** Emit a `delegation` message for a subtask. */
  async delegate(params: DelegateParams): Promise<SendOutcome> {
    this.assertRunning();

    const delegation = buildDelegation({
      from: this.identity.id,
      parentMessageId: params.parentMessageId,
      capability: params.capability,
      input: params.input,
      traceId: params.traceId,
      ...(params.to !== undefined ? { to: params.to } : {}),
      ...(params.reason !== undefined ? { reason: params.reason } : {}),
    });

    const outcome = await this.bus.send(delegation);
    if (outcome.ok) {
      await this.persistMessage(delegation);
    }
    return outcome;
  }

  private async handleIncoming(message: OacpMessage, context: DeliveryContext): Promise<void> {
    if (message.type === 'task_response') {
      this.resolvePendingResponse(message);
      return;
    }

    if (message.type !== 'task_request' && message.type !== 'delegation') {
      return;
    }

    await this.persistGraphMessage(message);

    if (!this.autoHandleTasks || !this.onTask) {
      return;
    }

    this.logger.info('task received', {
      trace_id: message.trace_id,
      message_id: message.message_id,
      message_type: message.type,
      capability: message.capability,
    });

    const executionContext = new ExecutionContext(this, message, context.deliveredAt);

    try {
      const result = await this.onTask(message, executionContext);
      await this.respond(message, result);
      this.logger.info('task completed', {
        trace_id: message.trace_id,
        message_id: message.message_id,
        status: result.status ?? 'success',
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('task handler failed', {
        trace_id: message.trace_id,
        message_id: message.message_id,
        error: err.message,
      });
      await this.respond(message, {
        status: 'error',
        error: {
          code: RUNTIME_ERROR_CODES.TASK_HANDLER_FAILED,
          message: err.message,
        },
      });
    }
  }

  private resolvePendingResponse(response: TaskResponseMessage): void {
    const pending = this.pendingResponses.get(response.in_reply_to);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    pending.resolve(response);
    this.pendingResponses.delete(response.in_reply_to);
  }

  private createResponsePromise(
    messageId: string,
    timeoutMs: number,
  ): Promise<TaskResponseMessage | undefined> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingResponses.delete(messageId);
        resolve(undefined);
      }, timeoutMs);

      this.pendingResponses.set(messageId, {
        resolve: (response) => {
          resolve(response);
        },
        timer,
      });
    });
  }

  private cancelResponseWait(messageId: string): void {
    const pending = this.pendingResponses.get(messageId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingResponses.delete(messageId);
    }
  }

  private clearPendingResponses(): void {
    for (const pending of this.pendingResponses.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingResponses.clear();
  }

  /** Best-effort memory persistence — must not fail task delivery. */
  private async persistMessage(message: OacpMessage): Promise<void> {
    const graphOptions = this.consumeGraphContext(message.message_id);

    if (this.taskRecorder) {
      try {
        if (message.type === 'task_request' && graphOptions?.parentMessageId !== undefined) {
          await this.taskRecorder.recordTaskRequest(message, this.memoryScope, {
            parentMessageId: graphOptions.parentMessageId,
          });
        } else {
          await this.taskRecorder.recordMessage(message, this.memoryScope);
        }
      } catch {
        // Memory write failures are non-fatal for task execution.
      }
    }

    await this.persistGraphMessage(message, graphOptions);
  }

  /** Record delegation graph edges without duplicating outbound memory entries. */
  private async persistGraphMessage(
    message: OacpMessage,
    graphOptions?: RecordDelegationMessageOptions,
  ): Promise<void> {
    if (!this.delegationGraphRecorder) {
      return;
    }
    try {
      await this.delegationGraphRecorder.recordMessage(message, graphOptions);
    } catch {
      // Graph write failures are non-fatal for task execution.
    }
  }

  private consumeGraphContext(messageId: string): RecordDelegationMessageOptions | undefined {
    const context = this.pendingGraphContext.get(messageId);
    if (context) {
      this.pendingGraphContext.delete(messageId);
    }
    return context;
  }

  private assertRunning(): void {
    if (this.state !== AGENT_LIFECYCLE_STATES.RUNNING) {
      throw new OacpRuntimeError(
        RUNTIME_ERROR_CODES.NOT_STARTED,
        `Agent "${this.identity.id}" must be started before sending or receiving tasks`,
      );
    }
  }

  private assertTransition(to: AgentLifecycleState): void {
    if (!canTransition(this.state, to)) {
      if (this.state === AGENT_LIFECYCLE_STATES.RUNNING && to === AGENT_LIFECYCLE_STATES.RUNNING) {
        throw new OacpRuntimeError(
          RUNTIME_ERROR_CODES.ALREADY_RUNNING,
          `Agent "${this.identity.id}" is already running`,
        );
      }
      throw new OacpRuntimeError(
        RUNTIME_ERROR_CODES.ALREADY_STOPPED,
        `Invalid lifecycle transition from "${this.state}" to "${to}"`,
      );
    }
  }
}

/** Create an agent runtime bound to a shared in-process bus. */
export function createAgentRuntime(options: AgentRuntimeOptions): AgentRuntime {
  return new AgentRuntime(options);
}
