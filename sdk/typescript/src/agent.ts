import {
  PROTOCOL_VERSION,
  createAgentRuntime,
  type AgentIdentity,
  type AgentRuntime,
  type DelegationMessage,
  type InMemoryMessageBus,
  type PublicKeyMaterial,
  type SendOutcome,
  type SendTaskParams,
  type TaskHandler,
  type TaskHandlerResult,
  type DelegationGraphRecorder,
  type TaskMemoryRecorder,
  type TaskRequestMessage,
  type TaskResponseMessage,
  type OacpLogger,
} from '@oacp/core';

import { DEFAULT_DEV_PUBLIC_KEY } from './defaults.js';

export interface AgentOptions {
  /** Human-readable agent name (also used to derive `agent://` URI). */
  readonly name: string;
  /** Agent URI; defaults to `agent://{name}`. */
  readonly id?: string;
  readonly capabilities: readonly string[];
  readonly bus: InMemoryMessageBus;
  readonly onTask?: TaskHandler;
  readonly publicKey?: PublicKeyMaterial;
  readonly description?: string;
  /** Automatically handle tasks with `onTask` (default: `true` when `onTask` is set). */
  readonly autoHandleTasks?: boolean;
  readonly defaultResponseTimeoutMs?: number;
  readonly taskRecorder?: TaskMemoryRecorder;
  readonly delegationGraphRecorder?: DelegationGraphRecorder;
  readonly memoryScope?: string;
  readonly logger?: OacpLogger;
}

/** Result returned by `Agent.sendTask()` for ergonomic SDK usage. */
export interface AgentTaskResult {
  readonly status: 'success' | 'error';
  readonly output?: Record<string, unknown>;
  readonly error?: TaskResponseMessage['error'];
  readonly request: TaskRequestMessage;
  readonly response?: TaskResponseMessage;
}

/**
 * High-level OACP agent for application and demo code.
 * Wraps `@oacp/core` `AgentRuntime` with identity bootstrap defaults.
 */
export class Agent {
  private readonly runtime: AgentRuntime;

  constructor(options: AgentOptions) {
    const id = options.id ?? `agent://${options.name}`;
    const identity: AgentIdentity = {
      id,
      name: options.name,
      version: PROTOCOL_VERSION,
      capabilities: [...options.capabilities],
      publicKey: options.publicKey ?? DEFAULT_DEV_PUBLIC_KEY,
      ...(options.description !== undefined ? { description: options.description } : {}),
    };

    this.runtime = createAgentRuntime({
      identity,
      bus: options.bus,
      ...(options.onTask !== undefined ? { onTask: options.onTask } : {}),
      ...(options.autoHandleTasks !== undefined
        ? { autoHandleTasks: options.autoHandleTasks }
        : {}),
      ...(options.defaultResponseTimeoutMs !== undefined
        ? { defaultResponseTimeoutMs: options.defaultResponseTimeoutMs }
        : {}),
      ...(options.taskRecorder !== undefined ? { taskRecorder: options.taskRecorder } : {}),
      ...(options.delegationGraphRecorder !== undefined
        ? { delegationGraphRecorder: options.delegationGraphRecorder }
        : {}),
      ...(options.memoryScope !== undefined ? { memoryScope: options.memoryScope } : {}),
      ...(options.logger !== undefined ? { logger: options.logger } : {}),
    });
  }

  get id(): string {
    return this.runtime.identity.id;
  }

  get identity(): AgentIdentity {
    return this.runtime.identity;
  }

  get isRunning(): boolean {
    return this.runtime.isRunning;
  }

  /** Underlying `@oacp/core` runtime (for `WorkflowEngine` and advanced APIs). */
  get agentRuntime(): AgentRuntime {
    return this.runtime;
  }

  start(): void {
    this.runtime.start();
  }

  stop(): void {
    this.runtime.stop();
  }

  /**
   * Send a task and wait for the correlated response.
   * Throws `OacpRuntimeError` on routing/runtime failures.
   */
  async sendTask(
    params: Omit<SendTaskParams, 'waitForResponse' | 'timeoutMs'> & { timeoutMs?: number },
  ): Promise<AgentTaskResult> {
    const { timeoutMs, ...taskParams } = params;
    const outcome = await this.runtime.sendTask({
      ...taskParams,
      waitForResponse: true,
      ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    });

    if (!outcome.ok) {
      throw outcome.error;
    }

    const response = outcome.response;
    const status = response?.status ?? 'success';

    return {
      status,
      ...(response?.output !== undefined ? { output: response.output } : {}),
      ...(response?.error !== undefined ? { error: response.error } : {}),
      request: outcome.request,
      ...(response !== undefined ? { response } : {}),
    };
  }

  receiveTask(timeoutMs?: number): Promise<TaskRequestMessage | DelegationMessage | undefined> {
    return this.runtime.receiveTask(timeoutMs);
  }

  respond(
    request: TaskRequestMessage | DelegationMessage,
    result: TaskHandlerResult,
  ): Promise<SendOutcome> {
    return this.runtime.respond(request, result);
  }
}
