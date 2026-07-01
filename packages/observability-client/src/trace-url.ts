/** Query parameter used for trace deep links across Console and MCPLab. */
export const TRACE_ID_QUERY_PARAM = 'trace_id' as const;

/** Query parameter for pre-selected agent in Console deep links. */
export const AGENT_QUERY_PARAM = 'agent' as const;

/** Graph layout mode in Console deep links (`legacy` | `ops` | `showcase`). */
export const GRAPH_MODE_QUERY_PARAM = 'mode' as const;

/** Default graph mode for MCPLab showcase deep links. */
export const DEFAULT_CONSOLE_GRAPH_MODE = 'showcase' as const;

/** Read `trace_id` from a URL search string (e.g. `window.location.search`). */
export function readTraceIdFromSearch(search: string): string | undefined {
  const value = new URLSearchParams(search).get(TRACE_ID_QUERY_PARAM);
  if (value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Read `agent` from a URL search string (agent URI, e.g. `agent://mcplab-planner`). */
export function readAgentIdFromSearch(search: string): string | undefined {
  const value = new URLSearchParams(search).get(AGENT_QUERY_PARAM);
  if (value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Return a new search string with `trace_id` and optional `agent` set or removed.
 * Preserves unrelated query parameters (`mode`, etc.).
 */
export function syncSelectionToSearch(
  search: string,
  selection: {
    readonly traceId?: string | undefined;
    readonly agentId?: string | undefined;
  },
): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  if (selection.traceId === undefined || selection.traceId.length === 0) {
    params.delete(TRACE_ID_QUERY_PARAM);
  } else {
    params.set(TRACE_ID_QUERY_PARAM, selection.traceId);
  }

  if (selection.agentId === undefined || selection.agentId.length === 0) {
    params.delete(AGENT_QUERY_PARAM);
  } else {
    params.set(AGENT_QUERY_PARAM, selection.agentId);
  }

  const next = params.toString();
  return next.length > 0 ? `?${next}` : '';
}

/**
 * Return a new search string with `trace_id` set or removed.
 * Preserves unrelated query parameters and their order where possible.
 */
export function writeTraceIdToSearch(search: string, traceId: string | undefined): string {
  const params = new URLSearchParams(search);

  if (traceId === undefined || traceId.length === 0) {
    params.delete(TRACE_ID_QUERY_PARAM);
  } else {
    params.set(TRACE_ID_QUERY_PARAM, traceId);
  }

  const next = params.toString();
  return next.length > 0 ? `?${next}` : '';
}

/** Read `mode` from a URL search string; returns `undefined` when absent or invalid. */
export function readGraphModeFromSearch(search: string): string | undefined {
  const value = new URLSearchParams(search).get(GRAPH_MODE_QUERY_PARAM);
  if (value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === 'legacy' || trimmed === 'ops' || trimmed === 'showcase') {
    return trimmed;
  }
  return undefined;
}

/**
 * Build an absolute or relative Console trace URL.
 * MCPLab and SDK helpers use `mode=showcase` by default.
 */
export function buildConsoleTraceUrl(
  baseUrl: string,
  traceId: string,
  options: { readonly mode?: string; readonly extraParams?: Readonly<Record<string, string>> } = {},
): string {
  const origin = baseUrl
    .replace(/\/+$/, '')
    .replace(/\/playground$/, '')
    .replace(/\/console$/, '');
  const params = new URLSearchParams(options.extraParams);
  params.set(TRACE_ID_QUERY_PARAM, traceId);
  params.set(GRAPH_MODE_QUERY_PARAM, options.mode ?? DEFAULT_CONSOLE_GRAPH_MODE);
  if (!params.has('showcase_layout')) {
    params.set('showcase_layout', 'force');
  }
  if (!params.has('showcase_bloom')) {
    params.set('showcase_bloom', 'medium');
  }
  return `${origin}/console/?${params.toString()}`;
}

/** Console home URL with showcase defaults (no trace). */
export function buildConsoleHomeUrl(
  baseUrl: string,
  options: { readonly extraParams?: Readonly<Record<string, string>> } = {},
): string {
  const origin = baseUrl
    .replace(/\/+$/, '')
    .replace(/\/playground$/, '')
    .replace(/\/console$/, '');
  const params = new URLSearchParams(options.extraParams);
  params.set(GRAPH_MODE_QUERY_PARAM, DEFAULT_CONSOLE_GRAPH_MODE);
  params.set('showcase_layout', 'force');
  params.set('showcase_bloom', 'medium');
  return `${origin}/console/?${params.toString()}`;
}

/** Build a Console deep link path with optional trace selection. */
export function buildTraceDeepLink(
  traceId: string,
  options: {
    readonly basePath?: string;
    readonly extraParams?: Readonly<Record<string, string>>;
  } = {},
): string {
  const basePath = options.basePath ?? '/console/';
  const params = new URLSearchParams(options.extraParams);
  params.set(TRACE_ID_QUERY_PARAM, traceId);
  if (!params.has(GRAPH_MODE_QUERY_PARAM)) {
    params.set(GRAPH_MODE_QUERY_PARAM, DEFAULT_CONSOLE_GRAPH_MODE);
  }
  return `${basePath}?${params.toString()}`;
}
