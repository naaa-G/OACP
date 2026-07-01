import { afterAll, describe, expect, it } from 'vitest';

import { SERVER_ERROR_CODES } from '../src/errors.js';
import {
  buildObservabilityRuntimeConfig,
  extractApiKeyFromRequest,
  isApiKeyProtectedRoute,
} from '../src/auth/api-key-auth.js';
import { createTestApp, loadSummarizerIdentity } from './helpers.js';

const TEST_API_KEY = 'test-enterprise-api-key-52';

function createAuthedTestApp() {
  return createTestApp({ config: { apiKey: TEST_API_KEY } });
}

function authHeaders(key: string = TEST_API_KEY): Record<string, string> {
  return { authorization: `Bearer ${key}` };
}

describe('API key auth (Day 52)', () => {
  describe('route classification', () => {
    it('protects observability routes except runtime-config', () => {
      expect(isApiKeyProtectedRoute('GET', '/v1/observability/snapshot')).toBe(true);
      expect(isApiKeyProtectedRoute('GET', '/v1/observability/events')).toBe(true);
      expect(isApiKeyProtectedRoute('GET', '/v1/observability/runtime-config')).toBe(false);
      expect(isApiKeyProtectedRoute('GET', '/playground/snapshot')).toBe(true);
    });

    it('protects mutating platform routes', () => {
      expect(isApiKeyProtectedRoute('POST', '/send-message')).toBe(true);
      expect(isApiKeyProtectedRoute('POST', '/agents')).toBe(true);
      expect(isApiKeyProtectedRoute('POST', '/workflows')).toBe(true);
      expect(isApiKeyProtectedRoute('POST', '/workflows/demo/run')).toBe(true);
    });

    it('leaves health and console static exempt', () => {
      expect(isApiKeyProtectedRoute('GET', '/health')).toBe(false);
      expect(isApiKeyProtectedRoute('GET', '/console/')).toBe(false);
      expect(isApiKeyProtectedRoute('GET', '/console/assets/index.js')).toBe(false);
    });
  });

  describe('extractApiKeyFromRequest', () => {
    it('reads Bearer, X-Api-Key, and SSE query param', () => {
      expect(
        extractApiKeyFromRequest({
          headers: { authorization: 'Bearer secret-token' },
          query: {},
        } as never),
      ).toBe('secret-token');

      expect(
        extractApiKeyFromRequest({
          headers: { 'x-api-key': 'header-key' },
          query: {},
        } as never),
      ).toBe('header-key');

      expect(
        extractApiKeyFromRequest({
          headers: {},
          query: { api_key: 'query-key' },
        } as never),
      ).toBe('query-key');
    });
  });

  describe('runtime config', () => {
    it('reports auth required when api key configured', () => {
      expect(buildObservabilityRuntimeConfig({ apiKey: TEST_API_KEY })).toEqual({
        ok: true,
        auth: {
          required: true,
          bearer: true,
          apiKeyHeader: 'x-api-key',
          sseQueryParam: 'api_key',
        },
      });
    });

    it('reports auth disabled in dev mode', () => {
      expect(buildObservabilityRuntimeConfig({})).toMatchObject({
        ok: true,
        auth: { required: false },
      });
    });
  });

  describe('HTTP enforcement', () => {
    const authedApp = createAuthedTestApp();

    afterAll(async () => {
      await authedApp.app.close();
    });

    it('GET /v1/observability/runtime-config is public', async () => {
      const response = await authedApp.app.inject({
        method: 'GET',
        url: '/v1/observability/runtime-config',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        ok: true,
        auth: { required: true },
      });
    });

    it('rejects observability snapshot without key', async () => {
      const response = await authedApp.app.inject({
        method: 'GET',
        url: '/v1/observability/snapshot',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        error: { code: SERVER_ERROR_CODES.UNAUTHORIZED },
      });
    });

    it('allows observability snapshot with Bearer key', async () => {
      const response = await authedApp.app.inject({
        method: 'GET',
        url: '/v1/observability/snapshot',
        headers: authHeaders(),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ ok: true });
    });

    it('rejects SSE without api_key query param', async () => {
      const response = await authedApp.app.inject({
        method: 'GET',
        url: '/v1/observability/events',
        headers: { accept: 'text/event-stream' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('accepts api_key query param for protected SSE route', () => {
      expect(
        extractApiKeyFromRequest({
          headers: {},
          query: { api_key: TEST_API_KEY },
        } as never),
      ).toBe(TEST_API_KEY);
      expect(isApiKeyProtectedRoute('GET', '/v1/observability/events')).toBe(true);
    });

    it('rejects POST /agents without key', async () => {
      const identity = loadSummarizerIdentity();
      const response = await authedApp.app.inject({
        method: 'POST',
        url: '/agents',
        payload: { identity },
      });

      expect(response.statusCode).toBe(401);
    });

    it('allows POST /agents with X-Api-Key', async () => {
      const identity = {
        ...loadSummarizerIdentity(),
        id: 'agent://api-key-test',
        name: 'API Key Test Agent',
      };
      const response = await authedApp.app.inject({
        method: 'POST',
        url: '/agents',
        headers: { 'x-api-key': TEST_API_KEY },
        payload: { identity },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ ok: true });
    });

    it('leaves GET /health public', async () => {
      const response = await authedApp.app.inject({ method: 'GET', url: '/health' });
      expect(response.statusCode).toBe(200);
    });
  });

  describe('dev mode (no api key)', () => {
    const devApp = createTestApp();

    afterAll(async () => {
      await devApp.app.close();
    });

    it('allows observability without credentials', async () => {
      const response = await devApp.app.inject({
        method: 'GET',
        url: '/v1/observability/snapshot',
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
