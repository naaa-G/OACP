import { ROUTING_ERROR_CODES } from '../routing/errors.js';
import { RUNTIME_ERROR_CODES } from '../runtime/errors.js';

/** Policy for resilient task delivery with agent failover and optional retries (Day 19). */
export interface TaskRecoveryPolicy {
  /** Retries per agent before trying the next candidate (default: `1`). */
  readonly maxAttemptsPerAgent?: number;
  /** Cap on total tries across all agents (default: unlimited). */
  readonly maxTotalAttempts?: number;
  /** Delay between retries on the same agent (default: `0`). */
  readonly retryBackoffMs?: number;
  /** Task error codes that warrant retry on the same agent. */
  readonly retryableTaskErrorCodes?: readonly string[];
  /** Transport/routing codes that warrant retry (defaults to transient routing/runtime errors). */
  readonly retryableTransportErrorCodes?: readonly string[];
  /** Alternate capabilities tried after the primary capability pool is exhausted. */
  readonly fallbackCapabilities?: readonly string[];
  /** Explicit agent order override (skips capability index lookup). */
  readonly fallbackAgents?: readonly string[];
  /** Skip agents that already failed for this send (default: `true`). */
  readonly excludeFailedAgents?: boolean;
}

export const DEFAULT_RETRYABLE_TRANSPORT_ERROR_CODES: readonly string[] = [
  ROUTING_ERROR_CODES.NO_RECIPIENT,
  ROUTING_ERROR_CODES.AGENT_NOT_REGISTERED,
  ROUTING_ERROR_CODES.DELIVERY_FAILED,
  RUNTIME_ERROR_CODES.RESPONSE_TIMEOUT,
  RUNTIME_ERROR_CODES.SEND_FAILED,
];

/** Conservative defaults — failover to next agent, no same-agent retry. */
export const DEFAULT_TASK_RECOVERY_POLICY: TaskRecoveryPolicy = {
  maxAttemptsPerAgent: 1,
  excludeFailedAgents: true,
  retryBackoffMs: 0,
  retryableTransportErrorCodes: DEFAULT_RETRYABLE_TRANSPORT_ERROR_CODES,
};

export interface NormalizedTaskRecoveryPolicy {
  readonly maxAttemptsPerAgent: number;
  readonly maxTotalAttempts: number | undefined;
  readonly retryBackoffMs: number;
  readonly retryableTaskErrorCodes: readonly string[];
  readonly retryableTransportErrorCodes: readonly string[];
  readonly fallbackCapabilities: readonly string[];
  readonly fallbackAgents: readonly string[] | undefined;
  readonly excludeFailedAgents: boolean;
}

export function normalizeTaskRecoveryPolicy(
  policy: TaskRecoveryPolicy = DEFAULT_TASK_RECOVERY_POLICY,
): NormalizedTaskRecoveryPolicy {
  return {
    maxAttemptsPerAgent: Math.max(1, policy.maxAttemptsPerAgent ?? 1),
    maxTotalAttempts:
      policy.maxTotalAttempts !== undefined && policy.maxTotalAttempts > 0
        ? policy.maxTotalAttempts
        : undefined,
    retryBackoffMs: Math.max(0, policy.retryBackoffMs ?? 0),
    retryableTaskErrorCodes: policy.retryableTaskErrorCodes ?? [],
    retryableTransportErrorCodes:
      policy.retryableTransportErrorCodes ?? DEFAULT_RETRYABLE_TRANSPORT_ERROR_CODES,
    fallbackCapabilities: policy.fallbackCapabilities ?? [],
    fallbackAgents: policy.fallbackAgents,
    excludeFailedAgents: policy.excludeFailedAgents ?? true,
  };
}

export function isRetryableTransportError(
  code: string,
  policy: NormalizedTaskRecoveryPolicy,
): boolean {
  return policy.retryableTransportErrorCodes.includes(code);
}

export function isRetryableTaskError(code: string, policy: NormalizedTaskRecoveryPolicy): boolean {
  if (policy.retryableTaskErrorCodes.length === 0) {
    return true;
  }
  return policy.retryableTaskErrorCodes.includes(code);
}

export function mergeRecoveryPolicies(
  base?: TaskRecoveryPolicy,
  override?: TaskRecoveryPolicy,
): TaskRecoveryPolicy | undefined {
  if (!base && !override) {
    return undefined;
  }
  return { ...base, ...override };
}

export function buildCapabilityChain(
  primaryCapability: string,
  stepFallbackCapabilities?: readonly string[],
  policy?: TaskRecoveryPolicy,
): readonly string[] {
  const chain: string[] = [primaryCapability];
  if (stepFallbackCapabilities) {
    chain.push(...stepFallbackCapabilities);
  }
  if (policy?.fallbackCapabilities) {
    chain.push(...policy.fallbackCapabilities);
  }
  return [...new Set(chain)];
}
