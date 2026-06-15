import type { AgentRuntime } from '../runtime/agent-runtime.js';
import { createTraceId } from '../runtime/message-factory.js';
import { executeStepTask } from '../resilience/step-executor.js';
import { executeDagPlan } from './dag-executor.js';
import type {
  RunWorkflowOptions,
  WorkflowDefinition,
  WorkflowRunFailure,
  WorkflowRunResult,
  WorkflowRunSuccess,
} from './workflow-definition-types.js';
import { workflowDefinitionToPlan } from './workflow-definition-types.js';
import { validateWorkflowDefinition } from './workflow-definition.js';
import type { SubtaskPlanStepResult } from './subtask-plan-types.js';

function resolveStepInputForHandler(
  step: WorkflowDefinition['steps'][number],
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

/**
 * Run a registered DAG workflow from a coordinator `AgentRuntime` (Day 18).
 * Steps share one `trace_id` and respect `dependsOn` edges with parallel batches.
 */
export async function runWorkflow(
  executor: AgentRuntime,
  definition: WorkflowDefinition,
  initialInput: Record<string, unknown>,
  options: RunWorkflowOptions = {},
): Promise<WorkflowRunResult> {
  validateWorkflowDefinition(definition);

  const traceId = options.traceId ?? createTraceId();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const runId = options.runId ?? createTraceId();
  const plan = workflowDefinitionToPlan(definition);

  const result = await executeDagPlan(
    plan,
    initialInput,
    traceId,
    async (step, dagContext) => {
      const input = resolveStepInputForHandler(step, dagContext, initialInput);
      return executeStepTask(
        {
          agentId: executor.identity.id,
          traceId,
          runtime: executor,
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
    {
      ...(options.failFast !== undefined ? { failFast: options.failFast } : {}),
      ...(options.onStepComplete !== undefined ? { onStepComplete: options.onStepComplete } : {}),
    },
  );

  if (!result.ok) {
    const failure: WorkflowRunFailure = {
      ok: false,
      runId,
      traceId: result.traceId,
      workflowId: definition.id,
      definition,
      failedStepId: result.failedStepId,
      steps: result.steps,
      error: result.error,
    };
    return failure;
  }

  const success: WorkflowRunSuccess = {
    ok: true,
    runId,
    traceId: result.traceId,
    workflowId: definition.id,
    definition,
    steps: result.steps,
    ...(result.output !== undefined ? { output: result.output } : {}),
  };
  return success;
}
