import type {
  TaskErrorBody,
  TaskRequestMessage,
  TaskResponseMessage,
} from '../protocol/message-schemas.js';
import type { InMemoryMessageBus } from '../routing/message-bus.js';
import { sortAgentsByUri } from '../routing/router.js';
import { RUNTIME_ERROR_CODES, OacpRuntimeError } from '../runtime/errors.js';
import type { RuntimeHandle, SendTaskParams } from '../runtime/types.js';
import {
  buildCapabilityChain,
  isRetryableTaskError,
  isRetryableTransportError,
  normalizeTaskRecoveryPolicy,
  type NormalizedTaskRecoveryPolicy,
  type TaskRecoveryPolicy,
} from './recovery-policy.js';

export type TaskRecoveryAttemptOutcome = 'transport_error' | 'task_error' | 'timeout' | 'success';

/** One try during resilient routing (audit / observability). */
export interface TaskRecoveryAttempt {
  readonly attempt: number;
  readonly agentId: string;
  readonly capability: string;
  readonly outcome: TaskRecoveryAttemptOutcome;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface ResilientSendTaskSuccess {
  readonly ok: true;
  readonly request: TaskRequestMessage;
  readonly response?: TaskResponseMessage;
  readonly recoveryAttempts: readonly TaskRecoveryAttempt[];
  readonly selectedAgent: string;
  readonly selectedCapability: string;
}

export interface ResilientSendTaskFailure {
  readonly ok: false;
  readonly error: OacpRuntimeError;
  readonly recoveryAttempts: readonly TaskRecoveryAttempt[];
}

export type ResilientSendTaskOutcome = ResilientSendTaskSuccess | ResilientSendTaskFailure;

export interface SendTaskWithRecoveryOptions {
  readonly policy?: TaskRecoveryPolicy;
  readonly stepFallbackCapabilities?: readonly string[];
  readonly sleepFn?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function resolveAgentCandidates(
  bus: InMemoryMessageBus,
  capability: string,
  explicitTo: string | undefined,
  policy: NormalizedTaskRecoveryPolicy,
): readonly string[] {
  if (explicitTo !== undefined) {
    return [explicitTo];
  }
  if (policy.fallbackAgents !== undefined && policy.fallbackAgents.length > 0) {
    return policy.fallbackAgents;
  }
  return sortAgentsByUri(bus.findAgentsByCapability(capability));
}

function classifyTransportError(code: string): TaskRecoveryAttemptOutcome {
  if (code === RUNTIME_ERROR_CODES.RESPONSE_TIMEOUT) {
    return 'timeout';
  }
  return 'transport_error';
}

function buildExhaustedError(
  capability: string,
  attempts: readonly TaskRecoveryAttempt[],
): OacpRuntimeError {
  const last = attempts.at(-1);
  const detail = last
    ? `Last failure: ${last.agentId} (${last.errorCode ?? last.outcome})`
    : 'No agents available';
  return new OacpRuntimeError(
    RUNTIME_ERROR_CODES.RECOVERY_EXHAUSTED,
    `Recovery exhausted for capability "${capability}" — ${detail}`,
    [{ path: '/capability', message: 'All candidate agents failed' }],
  );
}

/**
 * Send a task with alternate-agent failover and optional same-agent retries (Day 19).
 * Uses explicit `to` when set; otherwise walks the capability index and fallback capabilities.
 */
export async function sendTaskWithRecovery(
  runtime: RuntimeHandle,
  params: SendTaskParams,
  options: SendTaskWithRecoveryOptions = {},
): Promise<ResilientSendTaskOutcome> {
  const policy = normalizeTaskRecoveryPolicy(options.policy);
  const sleepFn = options.sleepFn ?? defaultSleep;
  const capabilities = buildCapabilityChain(
    params.capability,
    options.stepFallbackCapabilities,
    options.policy,
  );

  const attempts: TaskRecoveryAttempt[] = [];
  const failedAgents = new Set<string>();
  let totalAttempts = 0;

  for (const capability of capabilities) {
    let candidates = resolveAgentCandidates(runtime.bus, capability, params.to, policy);

    if (policy.excludeFailedAgents) {
      candidates = candidates.filter((agentId) => !failedAgents.has(agentId));
    }

    if (candidates.length === 0) {
      continue;
    }

    for (const agentId of candidates) {
      for (let attemptOnAgent = 1; attemptOnAgent <= policy.maxAttemptsPerAgent; attemptOnAgent++) {
        if (policy.maxTotalAttempts !== undefined && totalAttempts >= policy.maxTotalAttempts) {
          return {
            ok: false,
            error: buildExhaustedError(params.capability, attempts),
            recoveryAttempts: attempts,
          };
        }

        totalAttempts += 1;

        const outcome = await runtime.sendSubTask({
          ...params,
          capability,
          to: agentId,
        });

        if (!outcome.ok) {
          const errorCode = outcome.error.code;
          const attemptRecord: TaskRecoveryAttempt = {
            attempt: totalAttempts,
            agentId,
            capability,
            outcome: classifyTransportError(errorCode),
            errorCode,
            errorMessage: outcome.error.message,
          };
          attempts.push(attemptRecord);

          const retrySameAgent =
            attemptOnAgent < policy.maxAttemptsPerAgent &&
            isRetryableTransportError(errorCode, policy);

          if (!retrySameAgent) {
            if (policy.excludeFailedAgents) {
              failedAgents.add(agentId);
            }
            break;
          }

          if (policy.retryBackoffMs > 0) {
            await sleepFn(policy.retryBackoffMs);
          }
          continue;
        }

        const response = outcome.response;
        if (response?.status === 'error') {
          const taskError: TaskErrorBody = response.error ?? {
            code: RUNTIME_ERROR_CODES.TASK_HANDLER_FAILED,
            message: 'Task handler returned error status',
          };
          const attemptRecord: TaskRecoveryAttempt = {
            attempt: totalAttempts,
            agentId,
            capability,
            outcome: 'task_error',
            errorCode: taskError.code,
            errorMessage: taskError.message,
          };
          attempts.push(attemptRecord);

          const retrySameAgent =
            attemptOnAgent < policy.maxAttemptsPerAgent &&
            isRetryableTaskError(taskError.code, policy);

          if (!retrySameAgent) {
            if (policy.excludeFailedAgents) {
              failedAgents.add(agentId);
            }
            break;
          }

          if (policy.retryBackoffMs > 0) {
            await sleepFn(policy.retryBackoffMs);
          }
          continue;
        }

        attempts.push({
          attempt: totalAttempts,
          agentId,
          capability,
          outcome: 'success',
        });

        return {
          ok: true,
          request: outcome.request,
          ...(outcome.response !== undefined ? { response: outcome.response } : {}),
          recoveryAttempts: attempts,
          selectedAgent: agentId,
          selectedCapability: capability,
        };
      }
    }
  }

  return {
    ok: false,
    error: buildExhaustedError(params.capability, attempts),
    recoveryAttempts: attempts,
  };
}
