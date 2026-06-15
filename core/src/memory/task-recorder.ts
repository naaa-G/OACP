import type {
  DelegationMessage,
  OacpMessage,
  TaskRequestMessage,
  TaskResponseMessage,
} from '../protocol/message-schemas.js';
import { MemoryScopeManager } from './scope-manager.js';
import type { MemoryEntry, MemoryEntryInput, MemoryStore } from './types.js';

export interface TaskMemoryRecorderOptions {
  readonly scopeManager?: MemoryScopeManager;
  readonly defaultScope?: string;
}

export interface RecordDecisionParams {
  readonly scope?: string;
  readonly trace_id: string;
  readonly agent_id: string;
  readonly decision: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Records task history, outputs, and agent decisions into a `MemoryStore`.
 * Designed for bus hooks and runtime integration.
 */
export class TaskMemoryRecorder {
  private readonly store: MemoryStore;
  private readonly scopeManager: MemoryScopeManager;

  constructor(store: MemoryStore, options: TaskMemoryRecorderOptions = {}) {
    this.store = store;
    this.scopeManager =
      options.scopeManager ??
      new MemoryScopeManager(
        options.defaultScope !== undefined ? { defaultScope: options.defaultScope } : {},
      );
  }

  /** Persist an OACP message relevant to task history. */
  async recordMessage(message: OacpMessage, scope?: string): Promise<MemoryEntry | undefined> {
    if (message.type === 'task_request') {
      return this.recordTaskRequest(message, scope);
    }
    if (message.type === 'task_response') {
      return this.recordTaskResponse(message, scope);
    }
    if (message.type === 'delegation') {
      return this.recordDelegation(message, scope);
    }
    return undefined;
  }

  async recordTaskRequest(
    message: TaskRequestMessage,
    scope?: string,
    options?: { readonly parentMessageId?: string },
  ): Promise<MemoryEntry> {
    return this.append({
      scope: this.scopeManager.resolveScope(message.trace_id, scope),
      trace_id: message.trace_id,
      message_id: message.message_id,
      agent_id: message.from,
      kind: 'task_request',
      capability: message.capability,
      payload: {
        input: message.input,
        ...(message.to !== undefined ? { to: message.to } : {}),
        ...(message.deadline_ms !== undefined ? { deadline_ms: message.deadline_ms } : {}),
        ...(options?.parentMessageId !== undefined
          ? { parent_message_id: options.parentMessageId }
          : {}),
      },
    });
  }

  async recordTaskResponse(message: TaskResponseMessage, scope?: string): Promise<MemoryEntry> {
    const kind = message.output !== undefined ? 'output' : 'task_response';
    return this.append({
      scope: this.scopeManager.resolveScope(message.trace_id, scope),
      trace_id: message.trace_id,
      message_id: message.message_id,
      agent_id: message.from,
      kind,
      status: message.status,
      payload: {
        in_reply_to: message.in_reply_to,
        ...(message.output !== undefined ? { output: message.output } : {}),
        ...(message.error !== undefined ? { error: message.error } : {}),
      },
    });
  }

  async recordDelegation(message: DelegationMessage, scope?: string): Promise<MemoryEntry> {
    return this.append({
      scope: this.scopeManager.resolveScope(message.trace_id, scope),
      trace_id: message.trace_id,
      message_id: message.message_id,
      agent_id: message.from,
      kind: 'delegation',
      capability: message.capability,
      payload: {
        parent_message_id: message.parent_message_id,
        input: message.input,
        ...(message.to !== undefined ? { to: message.to } : {}),
        ...(message.reason !== undefined ? { reason: message.reason } : {}),
      },
    });
  }

  /** Record an explicit agent decision (not tied to a protocol message). */
  async recordDecision(params: RecordDecisionParams): Promise<MemoryEntry> {
    return this.append({
      scope: this.scopeManager.resolveScope(params.trace_id, params.scope),
      trace_id: params.trace_id,
      agent_id: params.agent_id,
      kind: 'decision',
      payload: { decision: params.decision },
      ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    });
  }

  private append(
    input: MemoryEntryInput & { metadata?: Record<string, unknown> },
  ): Promise<MemoryEntry> {
    return this.store.append(input);
  }
}

export function createTaskMemoryRecorder(
  store: MemoryStore,
  options?: TaskMemoryRecorderOptions,
): TaskMemoryRecorder {
  return new TaskMemoryRecorder(store, options);
}
