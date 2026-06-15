import type { RuntimeHandle, SendTaskParams } from '../runtime/types.js';
import { sendTaskWithRecovery } from './resilient-send.js';
import { mergeRecoveryPolicies, type TaskRecoveryPolicy } from './recovery-policy.js';
import type { SubtaskPlanStep, SubtaskPlanStepResult } from '../workflow/subtask-plan-types.js';

export interface StepTaskContext {
  readonly agentId: string;
  readonly traceId: string;
  readonly runtime: RuntimeHandle;
}

export interface StepTaskExecutionOptions {
  readonly timeoutMs?: number;
  readonly parentMessageId?: string;
  readonly recovery?: TaskRecoveryPolicy;
}

/** Execute one DAG/subtask step with optional resilient routing (Day 19). */
export async function executeStepTask(
  ctx: StepTaskContext,
  step: SubtaskPlanStep,
  input: Record<string, unknown>,
  options: StepTaskExecutionOptions = {},
): Promise<SubtaskPlanStepResult> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const recovery = mergeRecoveryPolicies(options.recovery, step.recovery);

  const params: SendTaskParams = {
    capability: step.capability,
    input,
    traceId: ctx.traceId,
    ...(step.to !== undefined ? { to: step.to } : {}),
    ...(options.parentMessageId !== undefined ? { parentMessageId: options.parentMessageId } : {}),
    timeoutMs,
  };

  if (recovery === undefined) {
    const outcome = await ctx.runtime.sendSubTask(params);
    if (!outcome.ok) {
      return {
        stepId: step.id,
        capability: step.capability,
        from: ctx.agentId,
        status: 'error',
        error: { code: outcome.error.code, message: outcome.error.message },
      };
    }

    const response = outcome.response;
    const status = response?.status ?? 'success';
    return {
      stepId: step.id,
      capability: step.capability,
      from: response?.from ?? 'unknown',
      status,
      requestMessageId: outcome.request.message_id,
      ...(response?.output !== undefined ? { output: response.output } : {}),
      ...(response?.error !== undefined ? { error: response.error } : {}),
    };
  }

  const resilient = await sendTaskWithRecovery(ctx.runtime, params, {
    policy: recovery,
    ...(step.fallbackCapabilities !== undefined
      ? { stepFallbackCapabilities: step.fallbackCapabilities }
      : {}),
  });

  if (!resilient.ok) {
    return {
      stepId: step.id,
      capability: step.capability,
      from: ctx.agentId,
      status: 'error',
      error: { code: resilient.error.code, message: resilient.error.message },
      recoveryAttempts: resilient.recoveryAttempts,
    };
  }

  const response = resilient.response;
  const status = response?.status ?? 'success';
  return {
    stepId: step.id,
    capability: resilient.selectedCapability,
    from: response?.from ?? resilient.selectedAgent,
    status,
    requestMessageId: resilient.request.message_id,
    recoveryAttempts: resilient.recoveryAttempts,
    ...(response?.output !== undefined ? { output: response.output } : {}),
    ...(response?.error !== undefined ? { error: response.error } : {}),
  };
}
