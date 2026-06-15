import type { FastifyInstance } from 'fastify';

import {
  OacpValidationError,
  OacpRoutingError,
  OacpWorkflowError,
  PROTOCOL_VERSION,
  ROUTING_ERROR_CODES,
  WORKFLOW_ERROR_CODES,
  parseAgentIdentity,
  validateMessage,
  buildDelegationGraphFromMemoryEntries,
} from '@oacp/core';
import type { MemoryEntryKind, OacpMessage, WorkflowDefinition } from '@oacp/core';

import { SERVER_ERROR_CODES, OacpServerError } from '../../errors.js';
import { normalizeAgentUriParam } from '../../utils/agent-uri.js';
import { runServerWorkflow } from '../../orchestration/workflow-runner.js';
import { listActiveTraces, resolveTraceBundle } from '../../observability/trace-service.js';
import { TRACE_VIEWER_HTML } from '../../observability/trace-viewer-html.js';
import { buildPlaygroundSnapshot } from '../../observability/playground-service.js';
import { PLAYGROUND_HTML } from '../../observability/playground-html.js';
import { buildServerIndexResponse, prefersHtmlResponse } from '../../observability/server-index.js';
import { assertValidCapabilityId, parseDiscoveryLimit } from '../../utils/capability-id.js';
import type {
  AgentLookupResponse,
  AgentsListResponse,
  CapabilityDiscoveryResponse,
  HealthResponse,
  ServerIndexResponse,
  MemoryEntriesResponse,
  MemoryEntryResponse,
  MemoryScopesResponse,
  DelegationGraphResponse,
  WorkflowsListResponse,
  WorkflowRunResponse,
  WorkflowRunRecordResponse,
  TraceListResponse,
  TraceDetailResponse,
  PlaygroundSnapshotResponse,
  RegisterAgentRequest,
  RegisterAgentResponse,
  SendMessageSuccessResponse,
  ServerContext,
} from './types.js';

const MEMORY_ENTRY_KINDS = new Set<MemoryEntryKind>([
  'task_request',
  'task_response',
  'delegation',
  'decision',
  'output',
]);

function parseMemoryLimit(value: string | undefined): number {
  return parseDiscoveryLimit(value);
}

function parseMemoryOffset(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new OacpServerError(400, SERVER_ERROR_CODES.VALIDATION_FAILED, 'Invalid offset');
  }
  return parsed;
}

async function persistMessageBestEffort(
  context: ServerContext,
  message: OacpMessage,
  options?: { readonly parentMessageId?: string },
): Promise<void> {
  try {
    if (message.type === 'task_request' && options?.parentMessageId !== undefined) {
      await context.taskRecorder.recordTaskRequest(message, undefined, {
        parentMessageId: options.parentMessageId,
      });
    } else {
      await context.taskRecorder.recordMessage(message);
    }
  } catch {
    // Memory persistence must not fail message delivery.
  }

  try {
    await context.delegationGraphRecorder.recordMessage(message, options);
  } catch {
    // Graph persistence must not fail message delivery.
  }
}

function mapCoreErrorToHttp(error: OacpValidationError | OacpRoutingError): OacpServerError {
  if (error instanceof OacpValidationError) {
    return new OacpServerError(
      400,
      SERVER_ERROR_CODES.VALIDATION_FAILED,
      error.message,
      error.details,
    );
  }

  if (error.code === ROUTING_ERROR_CODES.BUS_CLOSED) {
    return new OacpServerError(503, SERVER_ERROR_CODES.BUS_CLOSED, error.message, error.details);
  }

  if (
    error.code === ROUTING_ERROR_CODES.NO_RECIPIENT ||
    error.code === ROUTING_ERROR_CODES.AGENT_NOT_REGISTERED
  ) {
    return new OacpServerError(
      404,
      SERVER_ERROR_CODES.ROUTING_FAILED,
      error.message,
      error.details,
    );
  }

  return new OacpServerError(502, SERVER_ERROR_CODES.ROUTING_FAILED, error.message, error.details);
}

function mapWorkflowErrorToHttp(error: OacpWorkflowError): OacpServerError {
  if (
    error.code === WORKFLOW_ERROR_CODES.NOT_FOUND ||
    error.code === WORKFLOW_ERROR_CODES.RUN_NOT_FOUND
  ) {
    return new OacpServerError(
      404,
      SERVER_ERROR_CODES.AGENT_NOT_FOUND,
      error.message,
      error.details,
    );
  }
  return new OacpServerError(
    400,
    SERVER_ERROR_CODES.VALIDATION_FAILED,
    error.message,
    error.details,
  );
}

/** Register OACP reference HTTP routes on a Fastify instance. */
export function registerHttpRoutes(app: FastifyInstance, context: ServerContext): void {
  app.get('/', (request, reply) => {
    if (prefersHtmlResponse(request.headers.accept)) {
      return reply.redirect('/playground', 302);
    }

    const response: ServerIndexResponse = buildServerIndexResponse(context.registry.size);
    return response;
  });

  app.get('/health', () => {
    const stats = context.bus.getStats();
    const response: HealthResponse = {
      ok: true,
      status: 'healthy',
      protocol_version: PROTOCOL_VERSION,
      registered_agents: context.registry.size,
      bus_open: stats.isOpen,
    };
    return response;
  });

  app.post<{ Body: unknown }>('/send-message', async (request) => {
    const outcome = validateMessage(request.body);
    if (!outcome.valid) {
      throw new OacpServerError(
        400,
        SERVER_ERROR_CODES.VALIDATION_FAILED,
        outcome.error.message,
        outcome.error.details,
      );
    }

    context.capabilityRouter.prepareCapabilityRouting(outcome.data);

    const sendOutcome = await context.bus.send(outcome.data);
    if (!sendOutcome.ok) {
      throw mapCoreErrorToHttp(sendOutcome.error);
    }

    const routing = context.capabilityRouter.describeRouting(
      sendOutcome.message,
      sendOutcome.recipients,
    );

    await persistMessageBestEffort(context, sendOutcome.message);

    const response: SendMessageSuccessResponse = {
      ok: true,
      message_id: sendOutcome.message.message_id,
      trace_id: sendOutcome.message.trace_id,
      type: sendOutcome.message.type,
      recipients: sendOutcome.recipients,
      routing,
    };
    return response;
  });

  app.get<{ Params: { id: string }; Querystring: { timeoutMs?: string } }>(
    '/agent/:id/messages',
    async (request, reply) => {
      const agentId = normalizeAgentUriParam(request.params.id);
      const timeoutMs = Number.parseInt(request.query.timeoutMs ?? '5000', 10);
      const waitMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5_000;

      const message = await context.bus.waitForMessage(agentId, waitMs);
      if (!message) {
        return reply.status(204).send();
      }

      return { ok: true, message };
    },
  );

  app.get<{ Params: { id: string } }>('/agent/:id', (request) => {
    const agentId = normalizeAgentUriParam(request.params.id);
    const agent = context.registry.get(agentId);
    if (!agent) {
      throw new OacpServerError(
        404,
        SERVER_ERROR_CODES.AGENT_NOT_FOUND,
        `Agent "${agentId}" is not registered on this node`,
        [{ path: '/agent/:id', message: 'Register via POST /agents first' }],
      );
    }

    const response: AgentLookupResponse = { ok: true, agent };
    return response;
  });

  app.post<{ Body: RegisterAgentRequest }>('/agents', (request) => {
    const body = request.body;
    const identity = parseAgentIdentity(body.identity);
    const agent = context.registry.register(identity, { replace: body.replace ?? false });

    const registered = context.registry.get(agent.id);
    if (registered) {
      context.bus.register(registered.id, undefined, {
        capabilities: registered.capabilities,
        useMailbox: true,
      });
    }

    const response: RegisterAgentResponse = { ok: true, agent };
    return response;
  });

  app.get<{ Querystring: { capability?: string; limit?: string } }>('/agents', (request) => {
    const capability = request.query.capability;
    if (capability !== undefined && capability.length > 0) {
      assertValidCapabilityId(capability);
      const limit = parseDiscoveryLimit(request.query.limit);
      const agents = context.registry.findByCapability(capability, { limit });
      const response: CapabilityDiscoveryResponse = {
        ok: true,
        capability,
        agents,
        count: agents.length,
      };
      return response;
    }

    const response: AgentsListResponse = { ok: true, agents: context.registry.list() };
    return response;
  });

  app.get<{ Params: { capability: string }; Querystring: { limit?: string } }>(
    '/capabilities/:capability/agents',
    (request) => {
      const capability = decodeURIComponent(request.params.capability);
      assertValidCapabilityId(capability);
      const limit = parseDiscoveryLimit(request.query.limit);
      const agents = context.registry.findByCapability(capability, { limit });

      const response: CapabilityDiscoveryResponse = {
        ok: true,
        capability,
        agents,
        count: agents.length,
      };
      return response;
    },
  );

  app.get('/memory/scopes', async () => {
    const scopes = await context.memoryStore.listScopes();
    const response: MemoryScopesResponse = { ok: true, scopes };
    return response;
  });

  app.get<{
    Querystring: {
      scope?: string;
      trace_id?: string;
      agent_id?: string;
      kind?: string;
      capability?: string;
      since?: string;
      until?: string;
      limit?: string;
      offset?: string;
    };
  }>('/memory/entries', async (request) => {
    const kind = request.query.kind;
    if (kind !== undefined && !MEMORY_ENTRY_KINDS.has(kind as MemoryEntryKind)) {
      throw new OacpServerError(400, SERVER_ERROR_CODES.VALIDATION_FAILED, `Invalid kind: ${kind}`);
    }

    const entries = await context.memoryStore.query({
      ...(request.query.scope !== undefined ? { scope: request.query.scope } : {}),
      ...(request.query.trace_id !== undefined ? { trace_id: request.query.trace_id } : {}),
      ...(request.query.agent_id !== undefined
        ? { agent_id: normalizeAgentUriParam(request.query.agent_id) }
        : {}),
      ...(kind !== undefined ? { kind: kind as MemoryEntryKind } : {}),
      ...(request.query.capability !== undefined ? { capability: request.query.capability } : {}),
      ...(request.query.since !== undefined ? { since: request.query.since } : {}),
      ...(request.query.until !== undefined ? { until: request.query.until } : {}),
      limit: parseMemoryLimit(request.query.limit),
      offset: parseMemoryOffset(request.query.offset),
    });

    const response: MemoryEntriesResponse = {
      ok: true,
      entries,
      count: entries.length,
    };
    return response;
  });

  app.get<{ Params: { traceId: string }; Querystring: { limit?: string; offset?: string } }>(
    '/memory/traces/:traceId',
    async (request) => {
      const entries = await context.memoryStore.query({
        trace_id: request.params.traceId,
        limit: parseMemoryLimit(request.query.limit),
        offset: parseMemoryOffset(request.query.offset),
      });

      const response: MemoryEntriesResponse = {
        ok: true,
        entries,
        count: entries.length,
      };
      return response;
    },
  );

  app.get<{ Params: { id: string } }>('/memory/entries/:id', async (request) => {
    const entry = await context.memoryStore.get(request.params.id);
    if (!entry) {
      throw new OacpServerError(
        404,
        SERVER_ERROR_CODES.AGENT_NOT_FOUND,
        `Memory entry "${request.params.id}" not found`,
      );
    }
    const response: MemoryEntryResponse = { ok: true, entry };
    return response;
  });

  app.get<{ Querystring: { limit?: string; offset?: string } }>('/traces', (request) => {
    const result = listActiveTraces(context, {
      limit: parseMemoryLimit(request.query.limit),
      offset: parseMemoryOffset(request.query.offset),
    });
    const response: TraceListResponse = {
      ok: true,
      traces: result.traces,
      count: result.count,
      total: result.total,
    };
    return response;
  });

  app.get<{ Params: { traceId: string } }>('/traces/:traceId', async (request) => {
    const trace = await resolveTraceBundle(context, request.params.traceId);
    if (!trace) {
      throw new OacpServerError(
        404,
        SERVER_ERROR_CODES.AGENT_NOT_FOUND,
        `Trace "${request.params.traceId}" not found`,
      );
    }
    const response: TraceDetailResponse = { ok: true, trace };
    return response;
  });

  app.get('/trace-viewer', (_request, reply) => {
    return reply.type('text/html; charset=utf-8').send(TRACE_VIEWER_HTML);
  });

  app.get('/playground', (_request, reply) => {
    return reply.type('text/html; charset=utf-8').send(PLAYGROUND_HTML);
  });

  app.get<{ Querystring: { trace_id?: string; limit?: string } }>(
    '/playground/snapshot',
    async (request) => {
      const traceId = request.query.trace_id?.trim();
      const snapshot = await buildPlaygroundSnapshot(context, {
        traceLimit: parseMemoryLimit(request.query.limit),
        ...(traceId !== undefined && traceId.length > 0 ? { traceId } : {}),
      });
      const response: PlaygroundSnapshotResponse = { ok: true, snapshot };
      return response;
    },
  );

  app.get<{ Params: { traceId: string } }>('/graph/traces/:traceId', async (request) => {
    const traceId = request.params.traceId;

    const graph =
      (await context.delegationGraphRecorder.getGraph(traceId)) ??
      buildDelegationGraphFromMemoryEntries(
        await context.memoryStore.query({ trace_id: traceId, limit: 1000 }),
      );

    if (!graph || graph.nodes.length === 0) {
      throw new OacpServerError(
        404,
        SERVER_ERROR_CODES.AGENT_NOT_FOUND,
        `Delegation graph for trace "${traceId}" not found`,
      );
    }

    const response: DelegationGraphResponse = { ok: true, graph };
    return response;
  });

  app.get('/workflows', () => {
    const workflows = context.workflowEngine.listDefinitions();
    const response: WorkflowsListResponse = {
      ok: true,
      workflows,
      count: workflows.length,
    };
    return response;
  });

  app.post<{ Body: WorkflowDefinition }>('/workflows', (request) => {
    try {
      context.workflowEngine.register(request.body);
    } catch (error) {
      if (error instanceof OacpWorkflowError) {
        throw mapWorkflowErrorToHttp(error);
      }
      throw error;
    }
    return { ok: true, workflow: request.body };
  });

  app.post<{ Params: { workflowId: string }; Body: { input?: Record<string, unknown> } }>(
    '/workflows/:workflowId/run',
    async (request) => {
      const input = request.body?.input ?? {};
      try {
        const result = await runServerWorkflow(context, request.params.workflowId, input);
        const response: WorkflowRunResponse = { ok: true, result };
        return response;
      } catch (error) {
        if (error instanceof OacpWorkflowError) {
          throw mapWorkflowErrorToHttp(error);
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { runId: string } }>('/workflows/runs/:runId', async (request) => {
    const run = await context.workflowEngine.getRun(request.params.runId);
    if (!run) {
      throw new OacpServerError(
        404,
        SERVER_ERROR_CODES.AGENT_NOT_FOUND,
        `Workflow run "${request.params.runId}" not found`,
      );
    }
    const response: WorkflowRunRecordResponse = { ok: true, run };
    return response;
  });
}
