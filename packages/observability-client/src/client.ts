import { ObservabilityClientError } from './errors.js';
import { buildObservabilityAuthHeaders } from './auth.js';
import type {
  PlaygroundSnapshot,
  PlaygroundSnapshotErrorBody,
  PlaygroundSnapshotResponse,
  TraceGraphResponse,
  TraceGraphView,
} from './types.js';

/** Default snapshot path for Console and observability clients. */
export const OBSERVABILITY_SNAPSHOT_PATH = '/v1/observability/snapshot';

/** Legacy playground snapshot path for older MCPLab Docker images. */
const PLAYGROUND_SNAPSHOT_PATH = '/playground/snapshot';

/** @deprecated Use {@link OBSERVABILITY_SNAPSHOT_PATH}. */
export const DEFAULT_SNAPSHOT_PATH = OBSERVABILITY_SNAPSHOT_PATH;

/** Legacy playground snapshot path for older MCPLab Docker images. */
export const LEGACY_PLAYGROUND_SNAPSHOT_PATH = PLAYGROUND_SNAPSHOT_PATH;

export interface FetchSnapshotOptions {
  readonly baseUrl?: string | undefined;
  readonly traceId?: string | undefined;
  readonly limit?: number | undefined;
  readonly snapshotPath?: string | undefined;
  /** When true (default), retry `/playground/snapshot` if v1 returns 404 (older MCPLab Docker images). */
  readonly legacyFallback?: boolean | undefined;
  readonly fetchImpl?: typeof fetch | undefined;
  readonly apiKey?: string | undefined;
  readonly signal?: AbortSignal | undefined;
  /** Per-request timeout in ms (default 8000). */
  readonly timeoutMs?: number | undefined;
}

const DEFAULT_SNAPSHOT_TIMEOUT_MS = 8_000;

function isGatewayUnreachableStatus(status: number): boolean {
  return status === 0 || status === 502 || status === 503 || status === 504;
}

function mergeAbortSignals(primary: AbortSignal | undefined, secondary: AbortSignal): AbortSignal {
  if (primary === undefined) {
    return secondary;
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([primary, secondary]);
  }
  const controller = new AbortController();
  const abort = () => {
    controller.abort();
  };
  if (primary.aborted || secondary.aborted) {
    abort();
  } else {
    primary.addEventListener('abort', abort);
    secondary.addEventListener('abort', abort);
  }
  return controller.signal;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function snapshotOriginKey(baseUrl: string): string {
  return trimTrailingSlash(baseUrl);
}

/** Remember a working snapshot path per API origin (avoids v1 404 on every poll). */
const resolvedSnapshotPathByOrigin = new Map<string, string>();

function buildSnapshotUrl(
  baseUrl: string,
  snapshotPath: string,
  traceId: string | undefined,
  limit: number,
): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (traceId !== undefined && traceId.length > 0) {
    params.set('trace_id', traceId);
  }

  const root = trimTrailingSlash(baseUrl);
  const path = snapshotPath.startsWith('/') ? snapshotPath : `/${snapshotPath}`;
  return `${root}${path}?${params.toString()}`;
}

interface SnapshotFetchResult {
  readonly response: Response;
  readonly body: PlaygroundSnapshotResponse | PlaygroundSnapshotErrorBody;
}

async function requestSnapshot(
  url: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  apiKey: string | undefined,
): Promise<SnapshotFetchResult> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, timeoutMs);
  const mergedSignal = mergeAbortSignals(signal, timeoutController.signal);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...buildObservabilityAuthHeaders(apiKey) },
      signal: mergedSignal,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const isTimeout =
      cause instanceof Error && (cause.name === 'AbortError' || cause.name === 'TimeoutError');
    throw new ObservabilityClientError(
      isTimeout
        ? `OACP server unreachable (request timed out after ${timeoutMs}ms)`
        : `Network error fetching snapshot: ${message}`,
      { status: 0 },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let body: PlaygroundSnapshotResponse | PlaygroundSnapshotErrorBody;
  try {
    body = (await response.json()) as PlaygroundSnapshotResponse | PlaygroundSnapshotErrorBody;
  } catch {
    throw new ObservabilityClientError(
      isGatewayUnreachableStatus(response.status)
        ? `OACP server unreachable (HTTP ${response.status})`
        : `OACP server unreachable (invalid JSON, HTTP ${response.status})`,
      { status: 0 },
    );
  }

  return { response, body };
}

function parseObservabilityError(
  response: Response,
  body: PlaygroundSnapshotErrorBody,
): ObservabilityClientError {
  return new ObservabilityClientError(body.error?.message ?? `HTTP ${response.status}`, {
    status: response.status,
    code: body.error?.code,
  });
}

function parseSnapshotError(
  response: Response,
  body: PlaygroundSnapshotResponse | PlaygroundSnapshotErrorBody,
): ObservabilityClientError {
  return parseObservabilityError(response, body as PlaygroundSnapshotErrorBody);
}

/** Fetch unified observability snapshot from the OACP server. */
export async function fetchSnapshot(
  options: FetchSnapshotOptions = {},
): Promise<PlaygroundSnapshot> {
  const {
    baseUrl = '',
    traceId,
    limit = 25,
    snapshotPath = OBSERVABILITY_SNAPSHOT_PATH,
    legacyFallback = true,
    fetchImpl = fetch,
    apiKey,
    signal,
    timeoutMs = DEFAULT_SNAPSHOT_TIMEOUT_MS,
  } = options;

  const originKey = snapshotOriginKey(baseUrl);
  const preferredPath = resolvedSnapshotPathByOrigin.get(originKey) ?? snapshotPath;
  const url = buildSnapshotUrl(baseUrl, preferredPath, traceId, limit);

  const { response, body } = await requestSnapshot(url, fetchImpl, signal, timeoutMs, apiKey);

  if (legacyFallback && response.status === 404 && preferredPath === OBSERVABILITY_SNAPSHOT_PATH) {
    const legacyUrl = buildSnapshotUrl(baseUrl, PLAYGROUND_SNAPSHOT_PATH, traceId, limit);
    const legacyResult = await requestSnapshot(legacyUrl, fetchImpl, signal, timeoutMs, apiKey);

    if (legacyResult.response.ok && legacyResult.body.ok) {
      resolvedSnapshotPathByOrigin.set(originKey, PLAYGROUND_SNAPSHOT_PATH);
      return legacyResult.body.snapshot;
    }
  }

  if (!response.ok || !body.ok) {
    throw parseSnapshotError(response, body);
  }

  resolvedSnapshotPathByOrigin.set(originKey, preferredPath);
  return body.snapshot;
}

/** Default trace graph path for Ops 2D layout (Day 26). */
export const OBSERVABILITY_TRACE_GRAPH_PATH = '/v1/observability/traces';

export interface FetchTraceGraphOptions {
  readonly baseUrl?: string | undefined;
  readonly traceId: string;
  readonly fetchImpl?: typeof fetch | undefined;
  readonly apiKey?: string | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly timeoutMs?: number | undefined;
}

/**
 * Fetch trace-scoped agent graph for Ops mode (Day 26).
 * Returns only agents participating in the trace — not the full registry.
 */
export async function fetchTraceGraph(options: FetchTraceGraphOptions): Promise<TraceGraphView> {
  const {
    baseUrl = '',
    traceId,
    fetchImpl = fetch,
    apiKey,
    signal,
    timeoutMs = DEFAULT_SNAPSHOT_TIMEOUT_MS,
  } = options;

  const origin = trimTrailingSlash(baseUrl);
  const url = `${origin}${OBSERVABILITY_TRACE_GRAPH_PATH}/${encodeURIComponent(traceId)}/graph`;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, timeoutMs);

  const mergedSignal = mergeAbortSignals(signal, timeoutController.signal);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...buildObservabilityAuthHeaders(apiKey) },
      signal: mergedSignal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const body = (await response.json()) as TraceGraphResponse | PlaygroundSnapshotErrorBody;

  if (!response.ok || !body.ok) {
    throw parseObservabilityError(response, body as PlaygroundSnapshotErrorBody);
  }

  return body.graph;
}
