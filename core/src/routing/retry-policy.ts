/**
 * Retry policy for networked OACP delivery (Week 2, Day 12).
 * Used by remote HTTP clients for at-least-once transport semantics.
 */

export interface RetryPolicy {
  /** Total attempts including the first try (minimum 1). */
  readonly maxAttempts: number;
  readonly initialBackoffMs: number;
  readonly maxBackoffMs: number;
  /** Add random jitter to backoff (recommended for production). */
  readonly jitter?: boolean;
}

/** Conservative defaults for remote HTTP transports. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialBackoffMs: 100,
  maxBackoffMs: 5_000,
  jitter: true,
};

/** Disable retries explicitly. */
export const NO_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 1,
  initialBackoffMs: 0,
  maxBackoffMs: 0,
  jitter: false,
};

export interface RetryAttemptInfo {
  readonly attempt: number;
  readonly delayMs: number;
  readonly error: unknown;
}

export interface ExecuteWithRetryOptions {
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
  readonly onRetry?: (info: RetryAttemptInfo) => void;
  readonly sleepFn?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Compute exponential backoff delay for a zero-based attempt index. */
export function computeBackoffMs(attempt: number, policy: RetryPolicy): number {
  if (attempt <= 0) {
    return 0;
  }

  const exponential = policy.initialBackoffMs * 2 ** (attempt - 1);
  const capped = Math.min(policy.maxBackoffMs, exponential);

  if (policy.jitter === false) {
    return capped;
  }

  // Full jitter: uniform in [capped/2, capped]
  return Math.floor(capped / 2 + Math.random() * (capped / 2));
}

/** Validate and normalize a retry policy (throws on invalid config). */
export function normalizeRetryPolicy(policy: RetryPolicy): RetryPolicy {
  if (!Number.isFinite(policy.maxAttempts) || policy.maxAttempts < 1) {
    throw new Error('RetryPolicy.maxAttempts must be >= 1');
  }
  if (policy.initialBackoffMs < 0 || policy.maxBackoffMs < 0) {
    throw new Error('RetryPolicy backoff values must be >= 0');
  }
  if (policy.maxBackoffMs < policy.initialBackoffMs) {
    throw new Error('RetryPolicy.maxBackoffMs must be >= initialBackoffMs');
  }

  return {
    maxAttempts: Math.floor(policy.maxAttempts),
    initialBackoffMs: Math.floor(policy.initialBackoffMs),
    maxBackoffMs: Math.floor(policy.maxBackoffMs),
    ...(policy.jitter !== undefined ? { jitter: policy.jitter } : {}),
  };
}

/**
 * Execute an async function with exponential backoff retries.
 * The final error is re-thrown when `maxAttempts` is exhausted.
 */
export async function executeWithRetry<T>(
  fn: (attempt: number) => Promise<T>,
  policyInput: RetryPolicy,
  options: ExecuteWithRetryOptions = {},
): Promise<T> {
  const policy = normalizeRetryPolicy(policyInput);
  const sleepFn = options.sleepFn ?? defaultSleep;
  const maxAttempts = policy.maxAttempts;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      const canRetry =
        attempt < maxAttempts && (options.shouldRetry ? options.shouldRetry(error, attempt) : true);

      if (!canRetry) {
        break;
      }

      const delayMs = computeBackoffMs(attempt, policy);
      options.onRetry?.({ attempt, delayMs, error });

      if (delayMs > 0) {
        await sleepFn(delayMs);
      }
    }
  }

  throw lastError;
}
