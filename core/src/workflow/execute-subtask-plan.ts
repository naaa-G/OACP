import type { TaskExecutionContext } from '../runtime/types.js';
import { executeStepTask } from '../resilience/step-executor.js';
import { executeDagPlan } from './dag-executor.js';
import { OacpWorkflowError, WORKFLOW_ERROR_CODES } from './errors.js';
import type {
  DecomposeAndExecuteOptions,
  ExecuteSubtaskPlanOptions,
  SubtaskPlan,
  SubtaskPlanExecutionResult,
  SubtaskPlanStepResult,
  SubtaskPlannerContext,
} from './subtask-plan-types.js';

/**
 * Execute a validated `SubtaskPlan` via `sendSubTask`, respecting `dependsOn` edges.
 * Independent steps in the same batch may run in parallel.
 */
export async function executeSubtaskPlan(
  context: TaskExecutionContext,
  plan: SubtaskPlan,
  initialInput: Record<string, unknown>,
  options: ExecuteSubtaskPlanOptions = {},
): Promise<SubtaskPlanExecutionResult> {
  const timeoutMs = options.timeoutMs ?? 30_000;

  return executeDagPlan(
    plan,
    initialInput,
    context.traceId,
    async (step, dagContext) => {
      const input = resolveStepInputForHandler(step, dagContext, initialInput);
      return executeStepTask(
        {
          agentId: context.agentId,
          traceId: context.traceId,
          runtime: context.runtimeHandle,
        },
        step,
        input,
        {
          timeoutMs,
          ...(options.recovery !== undefined ? { recovery: options.recovery } : {}),
          ...(dagContext.parentMessageId !== undefined
            ? { parentMessageId: dagContext.parentMessageId }
            : {}),
        },
      );
    },
    options,
  );
}

function resolveStepInputForHandler(
  step: SubtaskPlan['steps'][number],
  dagContext: {
    initialInput: Record<string, unknown>;
    traceId: string;
    stepResults: ReadonlyMap<string, SubtaskPlanStepResult>;
  },
  initialInput: Record<string, unknown>,
): Record<string, unknown> {
  if (step.mapInput !== undefined) {
    return step.mapInput({
      initialInput: dagContext.initialInput,
      traceId: dagContext.traceId,
      stepResults: dagContext.stepResults,
      getStepResult(stepId: string) {
        return dagContext.stepResults.get(stepId);
      },
    });
  }
  return step.input ?? initialInput;
}

/** Plan and execute in one call — the primary orchestrator-agent API (Day 17). */
export async function decomposeAndExecute(
  context: TaskExecutionContext,
  options: DecomposeAndExecuteOptions,
): Promise<SubtaskPlanExecutionResult> {
  const capability = getRequestCapability(context);
  const plannerContext: SubtaskPlannerContext = {
    input: getRequestInput(context),
    traceId: context.traceId,
    agentId: context.agentId,
    messageId: context.messageId,
    ...(capability !== undefined ? { capability } : {}),
  };

  let plan: SubtaskPlan;
  try {
    plan = await options.planner.plan(plannerContext);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new OacpWorkflowError(WORKFLOW_ERROR_CODES.PLANNER_FAILED, message);
  }

  const executeOptions: ExecuteSubtaskPlanOptions = {
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
    ...(options.failFast !== undefined ? { failFast: options.failFast } : {}),
    ...(options.onPlanReady !== undefined ? { onPlanReady: options.onPlanReady } : {}),
    ...(options.onStepComplete !== undefined ? { onStepComplete: options.onStepComplete } : {}),
    ...(options.recovery !== undefined ? { recovery: options.recovery } : {}),
  };
  return executeSubtaskPlan(context, plan, plannerContext.input, executeOptions);
}

function getRequestInput(context: TaskExecutionContext): Record<string, unknown> {
  return context.request.input;
}

function getRequestCapability(context: TaskExecutionContext): string | undefined {
  return context.request.capability;
}
