export interface OacpClientOptions {
  readonly baseUrl: string;
  readonly apiKey?: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (apiKey !== undefined && apiKey.trim().length > 0) {
    headers['x-api-key'] = apiKey.trim();
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }
  return headers;
}

export function buildConsoleTraceUrl(baseUrl: string, traceId: string, mode = 'showcase'): string {
  const origin = normalizeBaseUrl(baseUrl)
    .replace(/\/console$/, '')
    .replace(/\/playground$/, '');
  const params = new URLSearchParams({ trace_id: traceId, mode });
  return `${origin}/console/?${params.toString()}`;
}

/** Minimal HTTP client for MCP tools — wraps existing OACP routes (no new protocol). */
export class OacpHttpClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(options: OacpClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.headers = buildHeaders(options.apiKey);
  }

  async health(): Promise<Record<string, unknown>> {
    return this.request('GET', '/health');
  }

  async registerAgent(
    identity: Record<string, unknown>,
    replace = true,
  ): Promise<Record<string, unknown>> {
    return this.request('POST', '/agents', { identity, replace });
  }

  async sendMessage(message: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request('POST', '/send-message', message);
  }

  async getSnapshot(): Promise<Record<string, unknown>> {
    return this.request('GET', '/v1/observability/snapshot');
  }

  get serverUrl(): string {
    return this.baseUrl;
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text();
    let payload: Record<string, unknown> = {};
    if (text.length > 0) {
      payload = JSON.parse(text) as Record<string, unknown>;
    }

    if (!response.ok) {
      throw new Error(`OACP ${method} ${path} failed (${response.status}): ${text}`);
    }

    return payload;
  }
}

export function createOacpClientFromEnv(env: NodeJS.ProcessEnv = process.env): OacpHttpClient {
  const baseUrl = env.OACP_SERVER_URL ?? env.OACP_BASE_URL ?? 'http://127.0.0.1:3847';
  const apiKey = env.OACP_API_KEY;
  return new OacpHttpClient({ baseUrl, apiKey });
}
