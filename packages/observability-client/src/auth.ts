/** Header name mirrored by the OACP server (`X-Api-Key`). */
export const OACP_API_KEY_HEADER = 'x-api-key' as const;

/** Query param for SSE when `EventSource` cannot send custom headers. */
export const OACP_API_KEY_SSE_QUERY_PARAM = 'api_key' as const;

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

/** Build Authorization header for observability HTTP requests. */
export function buildObservabilityAuthHeaders(apiKey: string | undefined): Record<string, string> {
  if (apiKey === undefined || apiKey.trim().length === 0) {
    return {};
  }
  return { Authorization: `Bearer ${apiKey.trim()}` };
}

/** Wrap `fetch` to attach API key headers on every request. */
export function createObservabilityFetch(
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): typeof fetch {
  const headers = buildObservabilityAuthHeaders(apiKey);
  if (Object.keys(headers).length === 0) {
    return fetchImpl;
  }

  return (input, init) =>
    fetchImpl(input, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
}

/** Fetch public runtime auth config from the OACP server (no secrets). */
export async function fetchObservabilityRuntimeConfig(
  options: {
    readonly baseUrl?: string | undefined;
    readonly fetchImpl?: typeof fetch | undefined;
    readonly signal?: AbortSignal | undefined;
  } = {},
): Promise<ObservabilityRuntimeConfigResponse> {
  const base = (options.baseUrl ?? '').replace(/\/$/, '');
  const url = `${base}/v1/observability/runtime-config`;
  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });

  if (!response.ok) {
    throw new Error(`Failed to load OACP runtime config (HTTP ${response.status})`);
  }

  return (await response.json()) as ObservabilityRuntimeConfigResponse;
}
