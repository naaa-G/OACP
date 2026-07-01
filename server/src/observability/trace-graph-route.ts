import type { FastifyRequest } from 'fastify';

import type { TraceGraphResponse } from '../api/http/types.js';
import { SERVER_ERROR_CODES, OacpServerError } from '../errors.js';
import { buildTraceGraphView, type TraceGraphServiceContext } from './trace-graph.js';

export interface TraceGraphRouteParams {
  readonly traceId: string;
}

/** Handler for `GET /v1/observability/traces/:traceId/graph`. */
export function createTraceGraphHandler(context: TraceGraphServiceContext) {
  return async (
    request: FastifyRequest<{ Params: TraceGraphRouteParams }>,
  ): Promise<TraceGraphResponse> => {
    const traceId = request.params.traceId.trim();
    const graph = await buildTraceGraphView(context, traceId);

    if (graph === undefined || graph.nodes.length === 0) {
      throw new OacpServerError(
        404,
        SERVER_ERROR_CODES.AGENT_NOT_FOUND,
        `Trace graph for "${traceId}" not found`,
      );
    }

    return { ok: true, graph };
  };
}
