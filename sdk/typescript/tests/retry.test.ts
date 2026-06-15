import { describe, expect, it, vi } from 'vitest';

import { CLIENT_ERROR_CODES, OacpClientError } from '../src/client/errors.js';
import { httpJsonRequest } from '../src/client/http-transport.js';
import { isRetryableClientError } from '../src/client/retry.js';

describe('client retry (Day 12)', () => {
  it('isRetryableClientError allows network and timeout errors', () => {
    expect(
      isRetryableClientError(new OacpClientError(CLIENT_ERROR_CODES.NETWORK_ERROR, 'net')),
    ).toBe(true);
    expect(isRetryableClientError(new OacpClientError(CLIENT_ERROR_CODES.TIMEOUT, 'timeout'))).toBe(
      true,
    );
  });

  it('isRetryableClientError rejects validation and routing errors', () => {
    expect(
      isRetryableClientError(new OacpClientError(CLIENT_ERROR_CODES.VALIDATION_FAILED, 'bad')),
    ).toBe(false);
    expect(
      isRetryableClientError(new OacpClientError(CLIENT_ERROR_CODES.ROUTING_FAILED, 'missing')),
    ).toBe(false);
  });

  it('isRetryableClientError retries 5xx server errors only', () => {
    expect(
      isRetryableClientError(
        new OacpClientError(CLIENT_ERROR_CODES.SERVER_ERROR, 'down', { statusCode: 503 }),
      ),
    ).toBe(true);
    expect(
      isRetryableClientError(
        new OacpClientError(CLIENT_ERROR_CODES.SERVER_ERROR, 'bad gateway', { statusCode: 502 }),
      ),
    ).toBe(true);
    expect(
      isRetryableClientError(
        new OacpClientError(CLIENT_ERROR_CODES.SERVER_ERROR, 'conflict', { statusCode: 409 }),
      ),
    ).toBe(false);
  });

  it('httpJsonRequest retries transient failures then succeeds', async () => {
    let calls = 0;
    const fetchFn = vi.fn(() => {
      calls += 1;
      if (calls < 3) {
        return Promise.reject(new Error('ECONNRESET'));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    const result = await httpJsonRequest<{ ok: true }>('http://test.local', {
      method: 'GET',
      path: '/health',
      timeoutMs: 5_000,
      headers: {},
      fetchFn,
      retryPolicy: { maxAttempts: 3, initialBackoffMs: 1, maxBackoffMs: 2, jitter: false },
    });

    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('httpJsonRequest does not retry 400 validation errors', async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ error: { code: 'SERVER_VALIDATION_FAILED', message: 'bad' } }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    await expect(
      httpJsonRequest('http://test.local', {
        method: 'POST',
        path: '/send-message',
        body: {},
        timeoutMs: 5_000,
        headers: {},
        fetchFn,
        retryPolicy: { maxAttempts: 3, initialBackoffMs: 1, maxBackoffMs: 2, jitter: false },
      }),
    ).rejects.toMatchObject({ code: CLIENT_ERROR_CODES.VALIDATION_FAILED });

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
