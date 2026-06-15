import type { TraceBundle } from '../observability/trace-bundle.js';
import type { TraceListEntry } from '../routing/trace-store.js';

export interface TraceClientOptions {
  readonly baseUrl: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly timeoutMs?: number;
}

export interface TraceListResponse {
  readonly ok: true;
  readonly traces: readonly TraceListEntry[];
  readonly count: number;
  readonly total: number;
}

export interface TraceDetailResponse {
  readonly ok: true;
  readonly trace: TraceBundle;
}

export class TraceClientError extends Error {
  readonly statusCode: number;
  readonly code: string | undefined;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = 'TraceClientError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function fetchJson(
  url: string,
  options: TraceClientOptions,
): Promise<{ status: number; body: unknown }> {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 10_000;
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    const body: unknown = await response.json();
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TraceClientError(
        0,
        `Request timed out after ${String(timeoutMs)}ms connecting to ${options.baseUrl}`,
        'timeout',
      );
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new TraceClientError(
      0,
      `Cannot reach OACP server at ${options.baseUrl}. Start one with \`oacp serve\` or \`oacp run --keep-alive\`. (${detail})`,
      'connection_failed',
    );
  } finally {
    clearTimeout(timer);
  }
}

/** HTTP client for OACP trace observability endpoints (Day 20). */
export class TraceClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(options: TraceClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async listTraces(query?: { limit?: number; offset?: number }): Promise<TraceListResponse> {
    const params = new URLSearchParams();
    if (query?.limit !== undefined) {
      params.set('limit', String(query.limit));
    }
    if (query?.offset !== undefined) {
      params.set('offset', String(query.offset));
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    const { status, body } = await fetchJson(`${this.baseUrl}/traces${suffix}`, {
      baseUrl: this.baseUrl,
      fetch: this.fetchFn,
      timeoutMs: this.timeoutMs,
    });

    if (status !== 200) {
      const err = body as { error?: { code?: string; message?: string } };
      throw new TraceClientError(
        status,
        err.error?.message ?? `Failed to list traces (${String(status)})`,
        err.error?.code,
      );
    }

    return body as TraceListResponse;
  }

  async getTrace(traceId: string): Promise<TraceBundle> {
    const { status, body } = await fetchJson(
      `${this.baseUrl}/traces/${encodeURIComponent(traceId)}`,
      { baseUrl: this.baseUrl, fetch: this.fetchFn, timeoutMs: this.timeoutMs },
    );

    if (status !== 200) {
      const err = body as { error?: { code?: string; message?: string } };
      throw new TraceClientError(
        status,
        err.error?.message ?? `Trace "${traceId}" not found (${String(status)})`,
        err.error?.code,
      );
    }

    return (body as TraceDetailResponse).trace;
  }
}

export function createTraceClient(options: TraceClientOptions): TraceClient {
  return new TraceClient(options);
}
