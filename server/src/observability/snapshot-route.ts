import type { FastifyRequest } from 'fastify';

import { buildObservabilitySnapshot, type PlaygroundServiceContext } from './playground-service.js';
import type { PlaygroundSnapshotResponse } from '../api/http/types.js';

export interface SnapshotQuerystring {
  readonly trace_id?: string;
  readonly limit?: string;
}

export interface SnapshotRouteOptions {
  readonly parseLimit: (value: string | undefined) => number;
}

/** Shared handler for v1 and legacy snapshot endpoints. */
export function createSnapshotHandler(
  context: PlaygroundServiceContext,
  options: SnapshotRouteOptions,
) {
  return async (
    request: FastifyRequest<{ Querystring: SnapshotQuerystring }>,
  ): Promise<PlaygroundSnapshotResponse> => {
    const traceId = request.query.trace_id?.trim();
    const snapshot = await buildObservabilitySnapshot(context, {
      traceLimit: options.parseLimit(request.query.limit),
      ...(traceId !== undefined && traceId.length > 0 ? { traceId } : {}),
    });

    return { ok: true, snapshot };
  };
}
