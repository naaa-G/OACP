import { PROTOCOL_VERSION } from '@oacp/core';

/** Well-known entry points exposed at `GET /` for API clients and ops tooling. */
export interface ServerIndexResponse {
  readonly ok: true;
  readonly service: 'oacp-reference-server';
  readonly protocol_version: string;
  readonly registered_agents: number;
  readonly ui: {
    readonly console: '/console';
    readonly playground: '/playground';
    readonly trace_viewer: '/trace-viewer';
  };
  readonly api: {
    readonly health: '/health';
    readonly agents: '/agents';
    readonly send_message: '/send-message';
    readonly traces: '/traces';
    readonly observability_snapshot: '/v1/observability/snapshot';
    readonly observability_trace_graph: '/v1/observability/traces/:traceId/graph';
    readonly observability_events: '/v1/observability/events';
    readonly openapi: '/v1/openapi.json';
    readonly workflows: '/workflows';
  };
}

export function buildServerIndexResponse(registeredAgents: number): ServerIndexResponse {
  return {
    ok: true,
    service: 'oacp-reference-server',
    protocol_version: PROTOCOL_VERSION,
    registered_agents: registeredAgents,
    ui: {
      console: '/console',
      playground: '/playground',
      trace_viewer: '/trace-viewer',
    },
    api: {
      health: '/health',
      agents: '/agents',
      send_message: '/send-message',
      traces: '/traces',
      observability_snapshot: '/v1/observability/snapshot',
      observability_trace_graph: '/v1/observability/traces/:traceId/graph',
      observability_events: '/v1/observability/events',
      openapi: '/v1/openapi.json',
      workflows: '/workflows',
    },
  };
}

/** Whether the client explicitly wants JSON (API discovery) vs browser navigation. */
export function prefersHtmlResponse(acceptHeader: string | undefined): boolean {
  if (acceptHeader === undefined || acceptHeader.trim().length === 0) {
    return true;
  }

  const accept = acceptHeader.toLowerCase();
  const jsonOnly =
    accept.includes('application/json') &&
    !accept.includes('text/html') &&
    !accept.includes('application/xhtml+xml') &&
    !accept.includes('*/*');

  // Default to playground redirect unless the client is clearly JSON-only.
  return !jsonOnly;
}
