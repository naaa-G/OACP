import type { FastifyInstance } from 'fastify';

import { bootstrapDevWorkflows, isDevWorkflowsEnabled } from './bootstrap/dev-workflows.js';
import { bootstrapApp, type CreateAppOptions } from './app.js';
import { loadServerConfig, type ServerConfig } from './config.js';

export interface StartServerOptions extends CreateAppOptions {
  readonly config?: Partial<ServerConfig>;
}

export interface RunningServer {
  readonly app: FastifyInstance;
  readonly url: string;
  close(): Promise<void>;
}

/** Start the OACP reference HTTP server and listen on configured host/port. */
export async function startServer(options: StartServerOptions = {}): Promise<RunningServer> {
  const config = { ...loadServerConfig(), ...options.config };
  const { app, context } = await bootstrapApp({
    ...options,
    config: { ...config, ...options.config },
    logger: options.logger ?? true,
  });

  const devBootstrap = isDevWorkflowsEnabled() ? bootstrapDevWorkflows(context) : undefined;

  const address = await app.listen({ host: config.host, port: config.port });

  return {
    app,
    url: address,
    close: async () => {
      devBootstrap?.stop();
      await context.memoryStore.close();
      await app.close();
    },
  };
}
