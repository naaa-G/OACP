import type { TaskErrorBody } from '../protocol/message-schemas.js';
import type { TaskStatus } from '../protocol/message-types.js';
import type { TaskRecoveryAttempt } from '../resilience/resilient-send.js';
import type { TaskRecoveryPolicy } from '../resilience/recovery-policy.js';

/** One decomposed subtask in a multi-step workflow plan (Day 17). */
export interface SubtaskPlanStep {
  /** Stable step identifier for dependencies and result lookup. */
  readonly id: string;
  readonly capability: string;
  readonly to?: string;
  /** Step ids that must complete before this step runs. */
  readonly dependsOn?: readonly string[];
  /** Static input when `mapInput` is not provided. */
  readonly input?: Record<string, unknown>;
  /** Build input from prior step outputs and the root task input. */
  readonly mapInput?: (context: SubtaskPlanContext) => Record<string, unknown>;
  /** Optional reason recorded when delegating (audit / observability). */
  readonly reason?: string;
  /** Alternate capabilities when primary agents fail (Day 19). */
  readonly fallbackCapabilities?: readonly string[];
  /** Per-step recovery overrides (Day 19). */
  readonly recovery?: TaskRecoveryPolicy;
}

/** Agent-produced decomposition of a parent task into subtasks. */
export interface SubtaskPlan {
  readonly steps: readonly SubtaskPlanStep[];
  readonly metadata?: Record<string, unknown>;
  /** Merge step outputs into the final task output (defaults to last step output). */
  readonly reduceOutput?: (context: SubtaskPlanContext) => Record<string, unknown>;
}

/** Mutable execution state while running a `SubtaskPlan`. */
export interface SubtaskPlanContext {
  readonly initialInput: Record<string, unknown>;
  readonly traceId: string;
  readonly stepResults: ReadonlyMap<string, SubtaskPlanStepResult>;
  getStepResult(stepId: string): SubtaskPlanStepResult | undefined;
}

export interface SubtaskPlanStepResult {
  readonly stepId: string;
  readonly capability: string;
  readonly from: string;
  readonly status: TaskStatus;
  readonly output?: Record<string, unknown>;
  readonly error?: TaskErrorBody;
  /** Originating `task_request` message id (for delegation graph parent links). */
  readonly requestMessageId?: string;
  /** Recovery attempt audit trail when failover routing was used (Day 19). */
  readonly recoveryAttempts?: readonly TaskRecoveryAttempt[];
}

export interface SubtaskPlanExecutionSuccess {
  readonly ok: true;
  readonly traceId: string;
  readonly plan: SubtaskPlan;
  readonly steps: readonly SubtaskPlanStepResult[];
  readonly output?: Record<string, unknown>;
}

export interface SubtaskPlanExecutionFailure {
  readonly ok: false;
  readonly traceId: string;
  readonly plan: SubtaskPlan;
  readonly failedStepId: string;
  readonly steps: readonly SubtaskPlanStepResult[];
  readonly error: TaskErrorBody | { readonly code: string; readonly message: string };
}

export type SubtaskPlanExecutionResult = SubtaskPlanExecutionSuccess | SubtaskPlanExecutionFailure;

export interface ExecuteSubtaskPlanOptions {
  readonly timeoutMs?: number;
  /** Stop on first failing step (default: `true`). */
  readonly failFast?: boolean;
  readonly onPlanReady?: (plan: SubtaskPlan) => void;
  readonly onStepComplete?: (result: SubtaskPlanStepResult) => void;
  /** Default recovery policy for all steps (Day 19). */
  readonly recovery?: TaskRecoveryPolicy;
}

/** Context passed to a `SubtaskPlanner` when decomposing a parent task. */
export interface SubtaskPlannerContext {
  readonly input: Record<string, unknown>;
  readonly traceId: string;
  readonly agentId: string;
  readonly capability?: string;
  readonly messageId: string;
}

/** Pluggable strategy for breaking a task into a `SubtaskPlan`. */
export interface SubtaskPlanner {
  plan(context: SubtaskPlannerContext): SubtaskPlan | Promise<SubtaskPlan>;
}

export interface DecomposeAndExecuteOptions extends ExecuteSubtaskPlanOptions {
  readonly planner: SubtaskPlanner;
}
