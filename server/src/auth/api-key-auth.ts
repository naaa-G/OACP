import { timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { SERVER_ERROR_CODES, OacpServerError } from '../errors.js';

/** Header accepted for static API keys (`X-Api-Key: <secret>`). */
export const OACP_API_KEY_HEADER = 'x-api-key' as const;

/** Query param for SSE when browsers cannot set headers on `EventSource`. */
export const OACP_API_KEY_SSE_QUERY_PARAM = 'api_key' as const;

const BEARER_PREFIX = 'Bearer ';

export interface ApiKeyAuthOptions {
  /** When unset or empty, auth is disabled (local dev mode). */
  readonly apiKey?: string | undefined;
}

export interface ObservabilityRuntimeAuthConfig {
  readonly required: boolean;
  readonly bearer: true;
  readonly apiKeyHeader: typeof OACP_API_KEY_HEADER;
  readonly sseQueryParam: typeof OACP_API_KEY_SSE_QUERY_PARAM;
}

export interface ObservabilityRuntimeConfigResponse {
  readonly ok: true;
  readonly auth: ObservabilityRuntimeAuthConfig;
}

function requestPathname(url: string): string {
  return url.split('?')[0] ?? url;
}

function normalizeApiKey(value: string): string {
  return value.trim();
}

function timingSafeEqualStrings(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/** Extract API key from Authorization Bearer, X-Api-Key, or SSE query param. */
export function extractApiKeyFromRequest(request: FastifyRequest): string | undefined {
  const authorization = request.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith(BEARER_PREFIX)) {
    const token = normalizeApiKey(authorization.slice(BEARER_PREFIX.length));
    if (token.length > 0) {
      return token;
    }
  }

  const headerValue = request.headers[OACP_API_KEY_HEADER];
  if (typeof headerValue === 'string') {
    const token = normalizeApiKey(headerValue);
    if (token.length > 0) {
      return token;
    }
  }

  const query = request.query as Record<string, unknown> | undefined;
  const queryValue = query?.[OACP_API_KEY_SSE_QUERY_PARAM];
  if (typeof queryValue === 'string') {
    const token = normalizeApiKey(queryValue);
    if (token.length > 0) {
      return token;
    }
  }

  return undefined;
}

function isObservabilityProtectedPath(pathname: string): boolean {
  if (pathname === '/v1/observability/runtime-config') {
    return false;
  }
  if (pathname.startsWith('/v1/observability/')) {
    return true;
  }
  return pathname === '/playground/snapshot';
}

function isMutatingProtectedRoute(method: string, pathname: string): boolean {
  if (method !== 'POST') {
    return false;
  }

  if (pathname === '/send-message' || pathname === '/agents') {
    return true;
  }

  if (pathname === '/v1/observability/import') {
    return true;
  }

  if (pathname === '/workflows') {
    return true;
  }

  return /^\/workflows\/[^/]+\/run$/.test(pathname);
}

/** Whether the route requires a valid API key when auth is enabled. */
export function isApiKeyProtectedRoute(method: string, url: string): boolean {
  const pathname = requestPathname(url);

  if (pathname === '/health') {
    return false;
  }

  if (pathname === '/' || pathname === '/playground' || pathname === '/trace-viewer') {
    return false;
  }

  if (pathname === '/console' || pathname.startsWith('/console/')) {
    return false;
  }

  if (isObservabilityProtectedPath(pathname)) {
    return true;
  }

  return isMutatingProtectedRoute(method, pathname);
}

function rejectUnauthorized(reply: FastifyReply): void {
  const error = new OacpServerError(
    401,
    SERVER_ERROR_CODES.UNAUTHORIZED,
    'Valid API key required. Send Authorization: Bearer <key>, X-Api-Key, or api_key query param for SSE.',
  );
  void reply.status(401).send(error.toJSON());
}

function validateApiKey(expectedKey: string, providedKey: string | undefined): boolean {
  if (providedKey === undefined || providedKey.length === 0) {
    return false;
  }
  return timingSafeEqualStrings(expectedKey, providedKey);
}

/** Public runtime config for Console and SDK bootstrap (no secrets). */
export function buildObservabilityRuntimeConfig(
  options: ApiKeyAuthOptions,
): ObservabilityRuntimeConfigResponse {
  const required = options.apiKey !== undefined && options.apiKey.length > 0;
  return {
    ok: true,
    auth: {
      required,
      bearer: true,
      apiKeyHeader: OACP_API_KEY_HEADER,
      sseQueryParam: OACP_API_KEY_SSE_QUERY_PARAM,
    },
  };
}

/** Register API key auth hook and public runtime-config route. */
export function registerApiKeyAuth(app: FastifyInstance, options: ApiKeyAuthOptions): void {
  const expectedKey = options.apiKey?.trim();
  const authEnabled = expectedKey !== undefined && expectedKey.length > 0;

  app.get('/v1/observability/runtime-config', () => {
    return buildObservabilityRuntimeConfig({ apiKey: expectedKey });
  });

  if (!authEnabled) {
    return;
  }

  app.addHook('onRequest', (request, reply, done) => {
    if (!isApiKeyProtectedRoute(request.method, request.url)) {
      done();
      return;
    }

    const providedKey = extractApiKeyFromRequest(request);
    if (!validateApiKey(expectedKey, providedKey)) {
      rejectUnauthorized(reply);
      return;
    }

    done();
  });
}
