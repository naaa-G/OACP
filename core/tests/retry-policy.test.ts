import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_RETRY_POLICY,
  NO_RETRY_POLICY,
  computeBackoffMs,
  executeWithRetry,
  normalizeRetryPolicy,
} from '../src/routing/retry-policy.js';

describe('retry policy (Day 12)', () => {
  it('computeBackoffMs caps at maxBackoffMs without jitter', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, jitter: false };
    expect(computeBackoffMs(1, policy)).toBe(100);
    expect(computeBackoffMs(2, policy)).toBe(200);
    expect(computeBackoffMs(10, policy)).toBe(5_000);
  });

  it('executeWithRetry succeeds on first attempt', async () => {
    const fn = vi.fn(() => Promise.resolve('ok'));
    const result = await executeWithRetry(fn, DEFAULT_RETRY_POLICY);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('executeWithRetry retries transient failures then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue('ok');

    const sleepFn = vi.fn(() => Promise.resolve());

    const result = await executeWithRetry(
      fn,
      { ...DEFAULT_RETRY_POLICY, jitter: false },
      { sleepFn },
    );

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleepFn).toHaveBeenCalledTimes(2);
  });

  it('executeWithRetry stops when shouldRetry returns false', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('fatal')));

    await expect(
      executeWithRetry(fn, DEFAULT_RETRY_POLICY, {
        shouldRetry: () => false,
      }),
    ).rejects.toThrow('fatal');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('executeWithRetry throws after maxAttempts exhausted', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('down')));

    await expect(
      executeWithRetry(
        fn,
        { ...NO_RETRY_POLICY, maxAttempts: 2 },
        { sleepFn: () => Promise.resolve() },
      ),
    ).rejects.toThrow('down');

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('normalizeRetryPolicy rejects invalid config', () => {
    expect(() => normalizeRetryPolicy({ ...DEFAULT_RETRY_POLICY, maxAttempts: 0 })).toThrow();
  });
});
