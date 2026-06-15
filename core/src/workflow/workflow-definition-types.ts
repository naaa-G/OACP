import type {
  SubtaskPlan,
  SubtaskPlanStep,
  SubtaskPlanStepResult,
  SubtaskPlanContext,
} from './subtask-plan-types.js';
import type { TaskRecoveryPolicy } from '../resilience/recovery-policy.js';

/** Registered DAG workflow definition (Day 18). */
export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly steps: readonly WorkflowStep[];
  readonly metadata?: Record<string, unknown>;
  readonly reduceOutput?: (context: SubtaskPlanContext) => Record<string, unknown>;
}

/** DAG step — same shape as `SubtaskPlanStep` for reuse. */
export type WorkflowStep = SubtaskPlanStep;

export type WorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Persisted workflow run record for observability and HTTP queries. */
export interface WorkflowRunRecord {
  readonly runId: string;
  readonly workflowId: string;
  readonly traceId: string;
  readonly status: WorkflowRunStatus;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly input: Record<string, unknown>;
  readonly output?: Record<string, unknown>;
  readonly failedStepId?: string;
  readonly steps?: readonly SubtaskPlanStepResult[];
  readonly error?: { readonly code: string; readonly message: string };
}

export interface WorkflowRunSuccess {
  readonly ok: true;
  readonly runId: string;
  readonly traceId: string;
  readonly workflowId: string;
  readonly definition: WorkflowDefinition;
  readonly steps: readonly SubtaskPlanStepResult[];
  readonly output?: Record<string, unknown>;
}

export interface WorkflowRunFailure {
  readonly ok: false;
  readonly runId: string;
  readonly traceId: string;
  readonly workflowId: string;
  readonly definition: WorkflowDefinition;
  readonly failedStepId: string;
  readonly steps: readonly SubtaskPlanStepResult[];
  readonly error: { readonly code: string; readonly message: string };
}

export type WorkflowRunResult = WorkflowRunSuccess | WorkflowRunFailure;

export interface RunWorkflowOptions {
  readonly runId?: string;
  readonly traceId?: string;
  readonly timeoutMs?: number;
  readonly failFast?: boolean;
  readonly onStepComplete?: (result: SubtaskPlanStepResult) => void;
  /** Default recovery policy for workflow steps (Day 19). */
  readonly recovery?: TaskRecoveryPolicy;
}

export interface WorkflowEngineOptions {
  readonly defaultTimeoutMs?: number;
}

/** Convert a registered definition to an executable subtask plan. */
export function workflowDefinitionToPlan(definition: WorkflowDefinition): SubtaskPlan {
  return {
    steps: definition.steps,
    ...(definition.metadata !== undefined ? { metadata: definition.metadata } : {}),
    ...(definition.reduceOutput !== undefined ? { reduceOutput: definition.reduceOutput } : {}),
  };
}
