import {
  CLIENT_ERROR_CODES,
  OacpClientError,
  type ClientErrorCode,
  type ClientErrorDetail,
} from './errors.js';
import { DEFAULT_RETRY_POLICY, executeClientRetry, type RetryPolicy } from './retry.js';

export type FetchFn = typeof fetch;

export interface HttpRequestOptions {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly body?: unknown;
  readonly query?: Record<string, string | number | undefined>;
  readonly timeoutMs: number;
  readonly headers: Record<string, string>;
  readonly fetchFn: FetchFn;
  /** Retry policy for transient transport failures (default: `DEFAULT_RETRY_POLICY`). */
  readonly retryPolicy?: RetryPolicy | false;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function mapServerError(status: number, body: unknown): OacpClientError {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = (
      body as { error: { code?: string; message?: string; details?: ClientErrorDetail[] } }
    ).error;

    let code: ClientErrorCode = CLIENT_ERROR_CODES.SERVER_ERROR;
    if (status === 401) {
      code = CLIENT_ERROR_CODES.UNAUTHORIZED;
    } else if (status === 400) {
      code = CLIENT_ERROR_CODES.VALIDATION_FAILED;
    } else if (status === 404) {
      code =
        error.code === 'SERVER_AGENT_NOT_FOUND'
          ? CLIENT_ERROR_CODES.AGENT_NOT_FOUND
          : CLIENT_ERROR_CODES.ROUTING_FAILED;
    }

    return new OacpClientError(code, error.message ?? `HTTP ${String(status)}`, {
      statusCode: status,
      details: error.details ?? [],
    });
  }

  return new OacpClientError(CLIENT_ERROR_CODES.SERVER_ERROR, `HTTP ${String(status)}`, {
    statusCode: status,
  });
}

async function httpJsonRequestOnce<T>(
  baseUrl: string,
  options: HttpRequestOptions,
): Promise<T | null> {
  const url = buildUrl(baseUrl, options.path, options.query);
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs);

  try {
    const response = await options.fetchFn(url, {
      method: options.method,
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
    });

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    const body: unknown = text.length > 0 ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      throw mapServerError(response.status, body);
    }

    return body as T;
  } catch (error) {
    if (error instanceof OacpClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OacpClientError(
        CLIENT_ERROR_CODES.TIMEOUT,
        `Request timed out after ${String(options.timeoutMs)}ms`,
        {
          details: [{ path: url, message: 'AbortError' }],
        },
      );
    }
    const message = error instanceof Error ? error.message : 'Network request failed';
    throw new OacpClientError(CLIENT_ERROR_CODES.NETWORK_ERROR, message);
  } finally {
    clearTimeout(timer);
  }
}

/** Low-level JSON HTTP transport with timeout, error mapping, and optional retries. */
export async function httpJsonRequest<T>(
  baseUrl: string,
  options: HttpRequestOptions,
): Promise<T | null> {
  const policy =
    options.retryPolicy === false ? undefined : (options.retryPolicy ?? DEFAULT_RETRY_POLICY);

  if (!policy || policy.maxAttempts <= 1) {
    return httpJsonRequestOnce<T>(baseUrl, options);
  }

  return executeClientRetry(() => httpJsonRequestOnce<T>(baseUrl, options), policy);
}
