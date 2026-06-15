import { OacpWorkflowError, WORKFLOW_ERROR_CODES } from './errors.js';
import { planExecutionBatches, validateSubtaskPlan } from './plan-validation.js';
import type {
  ExecuteSubtaskPlanOptions,
  SubtaskPlan,
  SubtaskPlanContext,
  SubtaskPlanExecutionResult,
  SubtaskPlanStep,
  SubtaskPlanStepResult,
} from './subtask-plan-types.js';

export interface DagStepExecutionContext {
  readonly initialInput: Record<string, unknown>;
  readonly traceId: string;
  readonly stepResults: ReadonlyMap<string, SubtaskPlanStepResult>;
  readonly parentMessageId?: string;
}

export type DagStepHandler = (
  step: SubtaskPlanStep,
  context: DagStepExecutionContext,
) => Promise<SubtaskPlanStepResult>;

function buildPlanContext(
  initialInput: Record<string, unknown>,
  traceId: string,
  stepResults: ReadonlyMap<string, SubtaskPlanStepResult>,
): SubtaskPlanContext {
  return {
    initialInput,
    traceId,
    stepResults,
    getStepResult(stepId: string) {
      return stepResults.get(stepId);
    },
  };
}

function resolveStepInput(
  step: SubtaskPlanStep,
  initialInput: Record<string, unknown>,
  traceId: string,
  stepResults: ReadonlyMap<string, SubtaskPlanStepResult>,
): Record<string, unknown> {
  if (step.mapInput !== undefined) {
    return step.mapInput(buildPlanContext(initialInput, traceId, stepResults));
  }
  return step.input ?? initialInput;
}

function defaultReduceOutput(
  stepResults: readonly SubtaskPlanStepResult[],
): Record<string, unknown> | undefined {
  const last = stepResults.at(-1);
  return last?.output;
}

function resolveParentMessageId(
  step: SubtaskPlanStep,
  stepMessageIds: ReadonlyMap<string, string>,
  workflowRootMessageId?: string,
): string | undefined {
  const deps = step.dependsOn ?? [];
  if (deps.length === 0) {
    return workflowRootMessageId;
  }
  for (const depId of deps) {
    const messageId = stepMessageIds.get(depId);
    if (messageId !== undefined) {
      return messageId;
    }
  }
  return workflowRootMessageId;
}

/**
 * Execute a validated DAG plan via a pluggable step handler.
 * Shared by in-agent `executeSubtaskPlan` and coordinator `runWorkflow` (Day 18).
 */
export async function executeDagPlan(
  plan: SubtaskPlan,
  initialInput: Record<string, unknown>,
  traceId: string,
  handler: DagStepHandler,
  options: ExecuteSubtaskPlanOptions = {},
): Promise<SubtaskPlanExecutionResult> {
  validateSubtaskPlan(plan);
  options.onPlanReady?.(plan);

  const failFast = options.failFast ?? true;
  const stepById = new Map(plan.steps.map((step) => [step.id, step]));
  const stepResults = new Map<string, SubtaskPlanStepResult>();
  const stepMessageIds = new Map<string, string>();
  const batches = planExecutionBatches(plan.steps);
  let workflowRootMessageId: string | undefined;

  for (const batch of batches) {
    const outcomes = await Promise.all(
      batch.map(async (stepId) => {
        const step = stepById.get(stepId);
        if (!step) {
          throw new OacpWorkflowError(
            WORKFLOW_ERROR_CODES.PLAN_INVALID,
            `Unknown step id "${stepId}"`,
            [{ path: `/steps/${stepId}`, message: 'step not found in plan' }],
          );
        }

        const input = resolveStepInput(step, initialInput, traceId, stepResults);
        const parentMessageId = resolveParentMessageId(step, stepMessageIds, workflowRootMessageId);

        const stepResult = await handler(step, {
          initialInput,
          traceId,
          stepResults,
          ...(parentMessageId !== undefined ? { parentMessageId } : {}),
        });

        return { step, stepResult, input };
      }),
    );

    for (const { step, stepResult } of outcomes) {
      stepResults.set(step.id, stepResult);
      options.onStepComplete?.(stepResult);

      if (stepResult.status === 'error') {
        if (failFast) {
          return {
            ok: false,
            traceId,
            plan,
            failedStepId: step.id,
            steps: [...stepResults.values()],
            error: stepResult.error ?? {
              code: WORKFLOW_ERROR_CODES.STEP_FAILED,
              message: `Step "${step.id}" failed`,
            },
          };
        }
        continue;
      }

      const requestMessageId = stepResult.requestMessageId;
      if (requestMessageId !== undefined) {
        stepMessageIds.set(step.id, requestMessageId);
        if (workflowRootMessageId === undefined) {
          workflowRootMessageId = requestMessageId;
        }
      }
    }
  }

  const steps = [...stepResults.values()];
  const planContext = buildPlanContext(initialInput, traceId, stepResults);
  const output = plan.reduceOutput ? plan.reduceOutput(planContext) : defaultReduceOutput(steps);

  return {
    ok: true,
    traceId,
    plan,
    steps,
    ...(output !== undefined ? { output } : {}),
  };
}
