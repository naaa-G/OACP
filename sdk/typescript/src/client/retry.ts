import {
  DEFAULT_RETRY_POLICY,
  computeBackoffMs,
  executeWithRetry,
  type RetryPolicy,
} from '@oacp/core';

import { CLIENT_ERROR_CODES, OacpClientError, type ClientErrorCode } from './errors.js';

export { DEFAULT_RETRY_POLICY, computeBackoffMs, executeWithRetry };
export type { RetryPolicy };

/** Delivery guarantee when client retries are enabled (Day 12). */
export const REMOTE_CLIENT_DELIVERY_GUARANTEE = 'at-least-once' as const;

const RETRYABLE_CODES: ReadonlySet<ClientErrorCode> = new Set([
  CLIENT_ERROR_CODES.NETWORK_ERROR,
  CLIENT_ERROR_CODES.TIMEOUT,
  CLIENT_ERROR_CODES.SERVER_ERROR,
]);

/** Whether a client transport error is safe to retry (transient failures only). */
export function isRetryableClientError(error: unknown): boolean {
  if (!(error instanceof OacpClientError)) {
    return false;
  }

  if (!RETRYABLE_CODES.has(error.code)) {
    return false;
  }

  if (error.code === CLIENT_ERROR_CODES.SERVER_ERROR) {
    const status = error.statusCode;
    return status === undefined || status >= 500;
  }

  return true;
}

/** Run an HTTP operation with the standard client retry policy. */
export async function executeClientRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): Promise<T> {
  return executeWithRetry(fn, policy, { shouldRetry: isRetryableClientError });
}
