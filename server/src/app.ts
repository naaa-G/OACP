import Fastify, { type FastifyInstance } from 'fastify';
import {
  OacpValidationError,
  OacpWorkflowError,
  WORKFLOW_ERROR_CODES,
  createDelegationGraphRecorder,
  createInMemoryMemoryStore,
  createMessageBus,
  createTaskMemoryRecorder,
  createWorkflowEngine,
} from '@oacp/core';

import { registerHttpRoutes } from './api/http/routes.js';
import type { ServerContext } from './api/http/types.js';
import { loadServerConfig, type ServerConfig } from './config.js';
import { SERVER_ERROR_CODES, OacpServerError } from './errors.js';
import { AgentRegistry } from './registry/agent-registry.js';
import { CapabilityRouter } from './routing/capability-router.js';
import { createMemoryStore } from './storage/create-memory-store.js';

export interface CreateAppOptions {
  readonly config?: Partial<ServerConfig>;
  readonly context?: Partial<ServerContext>;
  readonly logger?: boolean;
}

export interface OacpApp {
  readonly app: FastifyInstance;
  readonly context: ServerContext;
}

/** Create a configured Fastify application without listening. */
export function createApp(options: CreateAppOptions = {}): OacpApp {
  const config = options.config ?? {};
  const bus =
    options.context?.bus ??
    createMessageBus({
      ...(config.capabilityRoutingMode !== undefined
        ? { capabilityRoutingMode: config.capabilityRoutingMode }
        : {}),
    });
  const registry = options.context?.registry ?? new AgentRegistry();
  const routingContext = { bus, registry };
  const capabilityRouter =
    options.context?.capabilityRouter ??
    new CapabilityRouter(routingContext, {
      ...(config.capabilityRoutingMode !== undefined
        ? { capabilityRoutingMode: config.capabilityRoutingMode }
        : {}),
    });
  const memoryStore = options.context?.memoryStore ?? createInMemoryMemoryStore();
  const taskRecorder = options.context?.taskRecorder ?? createTaskMemoryRecorder(memoryStore);
  const delegationGraphRecorder =
    options.context?.delegationGraphRecorder ?? createDelegationGraphRecorder();
  const workflowEngine = options.context?.workflowEngine ?? createWorkflowEngine();
  const context: ServerContext = {
    bus,
    registry,
    capabilityRouter,
    memoryStore,
    taskRecorder,
    delegationGraphRecorder,
    workflowEngine,
  };

  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: options.config?.bodyLimitBytes ?? 1_048_576,
    requestTimeout: options.config?.requestTimeoutMs ?? 30_000,
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof OacpServerError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    if (error instanceof OacpValidationError) {
      const validationError = new OacpServerError(
        400,
        SERVER_ERROR_CODES.VALIDATION_FAILED,
        error.message,
        error.details,
      );
      return reply.status(400).send(validationError.toJSON());
    }

    if (error instanceof OacpWorkflowError) {
      const statusCode =
        error.code === WORKFLOW_ERROR_CODES.NOT_FOUND ||
        error.code === WORKFLOW_ERROR_CODES.RUN_NOT_FOUND
          ? 404
          : 400;
      const workflowError = new OacpServerError(
        statusCode,
        SERVER_ERROR_CODES.VALIDATION_FAILED,
        error.message,
        error.details,
      );
      return reply.status(statusCode).send(workflowError.toJSON());
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    const serverError = new OacpServerError(500, SERVER_ERROR_CODES.INTERNAL_ERROR, message);
    return reply.status(500).send(serverError.toJSON());
  });

  registerHttpRoutes(app, context);

  return { app, context };
}

/**
 * Bootstrap app with configured persistent memory backend (SQLite/Postgres).
 * Use for production `startServer`; tests may use synchronous `createApp`.
 */
export async function bootstrapApp(options: CreateAppOptions = {}): Promise<OacpApp> {
  if (options.context?.memoryStore !== undefined) {
    return createApp(options);
  }

  const config: ServerConfig = { ...loadServerConfig(), ...options.config };
  const memoryStore = await createMemoryStore({
    backend: config.memoryBackend,
    sqlitePath: config.memorySqlitePath,
    ...(config.memoryPostgresUrl !== undefined ? { postgresUrl: config.memoryPostgresUrl } : {}),
  });

  return createApp({
    ...options,
    config,
    context: {
      ...options.context,
      memoryStore,
      taskRecorder: createTaskMemoryRecorder(memoryStore),
    },
  });
}
