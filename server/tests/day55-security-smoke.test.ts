import { afterAll, describe, expect, it } from 'vitest';

import { SERVER_ERROR_CODES } from '../src/errors.js';
import {
  LEGACY_PLAYGROUND_SNAPSHOT_PATH,
  OBSERVABILITY_SNAPSHOT_PATH,
} from '../src/observability/playground-service.js';
import { createTestApp, loadSummarizerIdentity } from './helpers.js';

const TEST_API_KEY = 'day55-security-smoke-key';

describe('Day 55 security smoke (enterprise auth)', () => {
  const { app, context } = createTestApp({ config: { apiKey: TEST_API_KEY } });

  afterAll(async () => {
    await context.observabilityPersistence.close();
    await app.close();
  });

  function authHeaders(key: string = TEST_API_KEY): Record<string, string> {
    return { authorization: `Bearer ${key}` };
  }

  it('denies unauthenticated observability snapshot access', async () => {
    const response = await app.inject({
      method: 'GET',
      url: OBSERVABILITY_SNAPSHOT_PATH,
      headers: { Accept: 'application/json' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: SERVER_ERROR_CODES.UNAUTHORIZED },
    });
  });

  it('denies unauthenticated legacy snapshot access', async () => {
    const response = await app.inject({
      method: 'GET',
      url: LEGACY_PLAYGROUND_SNAPSHOT_PATH,
      headers: { Accept: 'application/json' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('denies unauthenticated agent registration and message send', async () => {
    const identity = {
      ...loadSummarizerIdentity(),
      id: 'agent://day55-security-agent',
      capabilities: ['echo'],
    };

    const register = await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity },
    });
    expect(register.statusCode).toBe(401);

    const send = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        type: 'task_request',
        message_id: 'd55-sec-0001-4000-8000-000000000001',
        trace_id: 'd55-sec-trace-0001-4000-8000-000000000001',
        from: identity.id,
        timestamp: '2026-07-01T00:00:00.000Z',
        capability: 'echo',
        input: { text: 'blocked' },
      },
    });
    expect(send.statusCode).toBe(401);
  });

  it('denies unauthenticated observability import', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/observability/import',
      payload: {
        trace_id: 'd55-sec-import-0001-4000-8000-000000000001',
        messages: [],
      },
    });
    expect(response.statusCode).toBe(401);
  });

  it('allows authenticated observability routes and keeps health public', async () => {
    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.body).not.toContain(TEST_API_KEY);

    const runtime = await app.inject({
      method: 'GET',
      url: '/v1/observability/runtime-config',
    });
    expect(runtime.statusCode).toBe(200);

    const snapshot = await app.inject({
      method: 'GET',
      url: OBSERVABILITY_SNAPSHOT_PATH,
      headers: { ...authHeaders(), Accept: 'application/json' },
    });
    expect(snapshot.statusCode).toBe(200);
  });

  it('rejects invalid API keys without leaking the configured secret', async () => {
    const response = await app.inject({
      method: 'GET',
      url: OBSERVABILITY_SNAPSHOT_PATH,
      headers: { ...authHeaders('wrong-key'), Accept: 'application/json' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).not.toContain(TEST_API_KEY);
  });
});
