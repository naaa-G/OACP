import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

/** URL prefix where the built Console SPA is mounted. */
export const CONSOLE_URL_PREFIX = '/console' as const;

const moduleDir = dirname(fileURLToPath(import.meta.url));

/** Default path to `apps/console/dist` relative to the compiled server package. */
export function resolveDefaultConsoleDistPath(): string {
  return resolve(moduleDir, '../../../apps/console/dist');
}

/** Resolve Console dist directory when `index.html` exists; otherwise `undefined`. */
export function resolveConsoleDistPath(configuredPath?: string): string | undefined {
  const candidate =
    configuredPath ?? process.env.OACP_CONSOLE_DIST ?? resolveDefaultConsoleDistPath();
  const indexPath = join(candidate, 'index.html');
  if (!existsSync(indexPath)) {
    return undefined;
  }
  return candidate;
}

/** Build `/console/` entry URL preserving query string from the incoming request. */
export function buildConsoleEntryUrl(requestUrl: string): string {
  const queryIndex = requestUrl.indexOf('?');
  const search = queryIndex >= 0 ? requestUrl.slice(queryIndex) : '';
  return `${CONSOLE_URL_PREFIX}/${search}`;
}

export interface RegisterConsoleStaticOptions {
  readonly distPath: string;
}

/**
 * Serve the production Console bundle from `apps/console/dist`.
 * Registers static assets under `/console/` and SPA fallback for client routes.
 */
export async function registerConsoleStatic(
  app: FastifyInstance,
  options: RegisterConsoleStaticOptions,
): Promise<void> {
  const { distPath } = options;

  app.get(CONSOLE_URL_PREFIX, async (request, reply) => {
    return reply.redirect(buildConsoleEntryUrl(request.url), 302);
  });

  await app.register(fastifyStatic, {
    root: distPath,
    prefix: `${CONSOLE_URL_PREFIX}/`,
    decorateReply: true,
  });

  app.setNotFoundHandler((request, reply) => {
    const pathname = request.url.split('?')[0] ?? '';
    const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;

    if (normalized.startsWith(`${CONSOLE_URL_PREFIX}/`)) {
      return reply.sendFile('index.html');
    }

    return reply.status(404).send({
      message: `Route ${request.method}:${request.url} not found`,
      error: 'Not Found',
      statusCode: 404,
    });
  });
}
