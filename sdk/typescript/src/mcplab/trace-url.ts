/** Query parameter used for trace deep links across Console and MCPLab. */
export const TRACE_ID_QUERY_PARAM = 'trace_id' as const;

/** Graph layout mode in Console deep links (`legacy` | `ops` | `showcase`). */
export const GRAPH_MODE_QUERY_PARAM = 'mode' as const;

/** Default graph mode for MCPLab showcase deep links. */
export const DEFAULT_CONSOLE_GRAPH_MODE = 'showcase' as const;

/**
 * Build an absolute Console trace URL for MCPLab crews and SDK demos.
 * Strips trailing `/playground` or `/console` from the server base URL.
 */
export function buildConsoleTraceUrl(
  baseUrl: string,
  traceId: string,
  options: {
    readonly mode?: string;
    readonly extraParams?: Readonly<Record<string, string>>;
  } = {},
): string {
  const origin = baseUrl
    .replace(/\/+$/, '')
    .replace(/\/playground$/, '')
    .replace(/\/console$/, '');
  const params = new URLSearchParams(options.extraParams);
  params.set(TRACE_ID_QUERY_PARAM, traceId);
  params.set(GRAPH_MODE_QUERY_PARAM, options.mode ?? DEFAULT_CONSOLE_GRAPH_MODE);
  return `${origin}/console/?${params.toString()}`;
}

/** @deprecated Use {@link buildConsoleTraceUrl}. */
export function buildPlaygroundTraceUrl(baseUrl: string, traceId: string): string {
  return buildConsoleTraceUrl(baseUrl, traceId);
}
