import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FastifyInstance } from 'fastify';

const OPENAPI_SPEC_RELATIVE = join('..', '..', '..', 'specs', 'openapi', 'v1.json');

/** Legacy snapshot sunset (removed v1.0.0). */
export const LEGACY_PLAYGROUND_SNAPSHOT_SUNSET = 'Wed, 31 Jul 2026 23:59:59 GMT';

export const LEGACY_PLAYGROUND_SNAPSHOT_SUCCESSOR = '/v1/observability/snapshot';

let cachedOpenApiJson: Record<string, unknown> | undefined;

function resolveOpenApiJsonPath(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return join(moduleDir, OPENAPI_SPEC_RELATIVE);
}

/** Load the frozen OpenAPI document served at `GET /v1/openapi.json`. */
export function loadOpenApiDocument(): Record<string, unknown> {
  if (cachedOpenApiJson !== undefined) {
    return cachedOpenApiJson;
  }

  const jsonPath = resolveOpenApiJsonPath();
  cachedOpenApiJson = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, unknown>;
  return cachedOpenApiJson;
}

/** Apply RFC 9745 deprecation headers for legacy snapshot clients. */
export function applyLegacySnapshotDeprecationHeaders(reply: {
  header: (name: string, value: string) => void;
}): void {
  reply.header('Deprecation', '@1754006399');
  reply.header('Sunset', LEGACY_PLAYGROUND_SNAPSHOT_SUNSET);
  reply.header('Link', `<${LEGACY_PLAYGROUND_SNAPSHOT_SUCCESSOR}>; rel="successor-version"`);
}

export function registerOpenApiRoute(app: FastifyInstance): void {
  app.get('/v1/openapi.json', (_request, reply) => {
    return reply.type('application/json; charset=utf-8').send(loadOpenApiDocument());
  });
}
