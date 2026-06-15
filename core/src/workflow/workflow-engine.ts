import type { AgentRuntime } from '../runtime/agent-runtime.js';
import { createTraceId } from '../runtime/message-factory.js';
import { OacpWorkflowError, WORKFLOW_ERROR_CODES } from './errors.js';
import { runWorkflow } from './run-workflow.js';
import { validateWorkflowDefinition } from './workflow-definition.js';
import type {
  RunWorkflowOptions,
  WorkflowDefinition,
  WorkflowEngineOptions,
  WorkflowRunRecord,
  WorkflowRunResult,
} from './workflow-definition-types.js';
import { createInMemoryWorkflowRunStore, type WorkflowRunStore } from './workflow-run-store.js';

/**
 * Enterprise DAG workflow engine — register definitions and run them from a coordinator runtime.
 * Day 18 builds on Day 17 subtask plans with persisted run records.
 */
export class WorkflowEngine {
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly runStore: WorkflowRunStore;
  private readonly defaultTimeoutMs: number;

  constructor(options: WorkflowEngineOptions & { readonly runStore?: WorkflowRunStore } = {}) {
    this.runStore = options.runStore ?? createInMemoryWorkflowRunStore();
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30_000;
  }

  /** Register or replace a workflow definition. */
  register(definition: WorkflowDefinition): void {
    validateWorkflowDefinition(definition);
    this.definitions.set(definition.id, definition);
  }

  unregister(workflowId: string): boolean {
    return this.definitions.delete(workflowId);
  }

  getDefinition(workflowId: string): WorkflowDefinition | undefined {
    return this.definitions.get(workflowId);
  }

  listDefinitions(): readonly WorkflowDefinition[] {
    return [...this.definitions.values()];
  }

  /** Execute a registered workflow and persist a run record. */
  async run(
    workflowId: string,
    executor: AgentRuntime,
    input: Record<string, unknown>,
    options: RunWorkflowOptions = {},
  ): Promise<WorkflowRunResult> {
    const definition = this.definitions.get(workflowId);
    if (!definition) {
      throw new OacpWorkflowError(
        WORKFLOW_ERROR_CODES.NOT_FOUND,
        `Workflow "${workflowId}" is not registered`,
        [{ path: '/workflowId', message: 'unknown workflow id' }],
      );
    }

    const runId = options.runId ?? createTraceId();
    const traceId = options.traceId ?? createTraceId();
    const startedAt = new Date().toISOString();

    const pending: WorkflowRunRecord = {
      runId,
      workflowId,
      traceId,
      status: 'running',
      startedAt,
      input,
    };
    await this.runStore.save(pending);

    const result = await runWorkflow(executor, definition, input, {
      ...options,
      runId,
      traceId,
      timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
    });

    const completedAt = new Date().toISOString();

    if (!result.ok) {
      const failed: WorkflowRunRecord = {
        runId,
        workflowId,
        traceId: result.traceId,
        status: 'failed',
        startedAt,
        completedAt,
        input,
        failedStepId: result.failedStepId,
        steps: result.steps,
        error: result.error,
      };
      await this.runStore.save(failed);
      return result;
    }

    const completed: WorkflowRunRecord = {
      runId,
      workflowId,
      traceId: result.traceId,
      status: 'completed',
      startedAt,
      completedAt,
      input,
      steps: result.steps,
      ...(result.output !== undefined ? { output: result.output } : {}),
    };
    await this.runStore.save(completed);
    return result;
  }

  getRun(runId: string): Promise<WorkflowRunRecord | undefined> {
    return this.runStore.get(runId);
  }

  listRuns(workflowId: string): Promise<readonly WorkflowRunRecord[]> {
    return this.runStore.listByWorkflow(workflowId);
  }

  listRecentRuns(limit?: number): Promise<readonly WorkflowRunRecord[]> {
    return this.runStore.listRecent(limit);
  }
}

export function createWorkflowEngine(
  options?: WorkflowEngineOptions & { readonly runStore?: WorkflowRunStore },
): WorkflowEngine {
  return new WorkflowEngine(options);
}
