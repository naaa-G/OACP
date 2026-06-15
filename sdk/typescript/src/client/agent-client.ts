import {
  buildTaskRequest,
  parseMessage,
  type AgentIdentity,
  type DeliveryGuarantee,
  type OacpMessage,
  type TaskResponseMessage,
} from '@oacp/core';

import type { AgentTaskResult } from '../agent.js';
import { CLIENT_ERROR_CODES, OacpClientError } from './errors.js';
import { httpJsonRequest, type FetchFn } from './http-transport.js';
import {
  DEFAULT_RETRY_POLICY,
  REMOTE_CLIENT_DELIVERY_GUARANTEE,
  type RetryPolicy,
} from './retry.js';
import type {
  CapabilityDiscoveryResult,
  FindAgentsByCapabilityOptions,
  HealthCheckResult,
  ListAgentsOptions,
  ReceiveMessageResult,
  RegisterAgentOptions,
  RemoteSendTaskParams,
  SendMessageResult,
  WorkflowRunRemoteResult,
} from './types.js';

export interface AgentClientOptions {
  /** Base URL of the OACP reference server (e.g. `http://localhost:3847`). */
  readonly baseUrl: string;
  /** Per-request HTTP timeout in ms (default: 30_000). */
  readonly timeoutMs?: number;
  readonly headers?: Record<string, string>;
  /** Injectable fetch for tests (default: global `fetch`). */
  readonly fetchFn?: FetchFn;
  /**
   * Retry policy for transient HTTP failures (default: `DEFAULT_RETRY_POLICY`).
   * Set `false` to disable retries.
   */
  readonly retryPolicy?: RetryPolicy | false;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 100;

function encodeAgentPath(agentId: string): string {
  const shortId = agentId.startsWith('agent://') ? agentId.slice('agent://'.length) : agentId;
  return encodeURIComponent(shortId);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Enterprise-grade HTTP client for remote OACP messaging.
 * Talks to `@oacp/server` endpoints for send, receive, and agent lookup.
 */
export class AgentClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly headers: Record<string, string>;
  private readonly fetchFn: FetchFn;
  private readonly retryPolicy: RetryPolicy | false;

  constructor(options: AgentClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.headers = options.headers ?? {};
    this.fetchFn = options.fetchFn ?? fetch;
    this.retryPolicy = options.retryPolicy ?? DEFAULT_RETRY_POLICY;
  }

  get serverUrl(): string {
    return this.baseUrl;
  }

  /** Delivery guarantee for this remote HTTP client (at-least-once with retries). */
  get deliveryGuarantee(): DeliveryGuarantee {
    return this.retryPolicy === false ? 'at-most-once' : REMOTE_CLIENT_DELIVERY_GUARANTEE;
  }

  /** Check server health and protocol version. */
  async health(): Promise<HealthCheckResult> {
    const result = await this.request<HealthCheckResult>({ method: 'GET', path: '/health' });
    if (!result) {
      throw new OacpClientError(CLIENT_ERROR_CODES.INVALID_RESPONSE, 'Empty health response');
    }
    return result;
  }

  /** Register an agent identity on the remote node. */
  async registerAgent(
    identity: AgentIdentity,
    options: RegisterAgentOptions = {},
  ): Promise<AgentIdentity> {
    const result = await this.request<{ ok: true; agent: AgentIdentity }>({
      method: 'POST',
      path: '/agents',
      body: { identity, replace: options.replace ?? false },
    });
    if (!result) {
      throw new OacpClientError(CLIENT_ERROR_CODES.INVALID_RESPONSE, 'Empty register response');
    }
    return result.agent;
  }

  /** List registered agents, optionally filtered by capability. */
  async listAgents(options: ListAgentsOptions = {}): Promise<AgentIdentity[]> {
    const result = await this.request<
      CapabilityDiscoveryResult | { ok: true; agents: AgentIdentity[] }
    >({
      method: 'GET',
      path: '/agents',
      ...(options.capability !== undefined || options.limit !== undefined
        ? {
            query: {
              ...(options.capability !== undefined ? { capability: options.capability } : {}),
              ...(options.limit !== undefined ? { limit: options.limit } : {}),
            },
          }
        : {}),
    });

    if (!result) {
      throw new OacpClientError(CLIENT_ERROR_CODES.INVALID_RESPONSE, 'Empty agents list response');
    }

    if ('capability' in result) {
      return [...result.agents];
    }

    return [...result.agents];
  }

  /** Discover agents that declare a capability on the remote node. */
  async findAgentsByCapability(
    capability: string,
    options: FindAgentsByCapabilityOptions = {},
  ): Promise<AgentIdentity[]> {
    const result = await this.request<CapabilityDiscoveryResult>({
      method: 'GET',
      path: `/capabilities/${encodeURIComponent(capability)}/agents`,
      ...(options.limit !== undefined ? { query: { limit: options.limit } } : {}),
    });

    if (!result) {
      throw new OacpClientError(
        CLIENT_ERROR_CODES.INVALID_RESPONSE,
        'Empty capability discovery response',
      );
    }

    return [...result.agents];
  }

  /** Look up a registered agent by URI or short name. */
  async getAgent(agentId: string): Promise<AgentIdentity> {
    const result = await this.request<{ ok: true; agent: AgentIdentity }>({
      method: 'GET',
      path: `/agent/${encodeAgentPath(agentId)}`,
    });
    if (!result) {
      throw new OacpClientError(CLIENT_ERROR_CODES.INVALID_RESPONSE, 'Empty agent lookup response');
    }
    return result.agent;
  }

  /** Send any OACP message to the remote node (`POST /send-message`). */
  async send(message: OacpMessage): Promise<SendMessageResult> {
    const result = await this.request<SendMessageResult>({
      method: 'POST',
      path: '/send-message',
      body: message,
    });
    if (!result) {
      throw new OacpClientError(CLIENT_ERROR_CODES.INVALID_RESPONSE, 'Empty send response');
    }
    return result;
  }

  /**
   * Pull the next message for an agent mailbox (`GET /agent/:id/messages`).
   * Returns `null` when no message arrives within the server wait window.
   */
  async receiveMessage(
    agentId: string,
    options: { timeoutMs?: number } = {},
  ): Promise<OacpMessage | null> {
    const waitMs = options.timeoutMs ?? 5_000;
    const result = await this.request<ReceiveMessageResult>({
      method: 'GET',
      path: `/agent/${encodeAgentPath(agentId)}/messages`,
      query: { timeoutMs: waitMs },
      timeoutMs: waitMs + this.timeoutMs,
    });

    if (!result) {
      return null;
    }

    return parseMessage(result.message);
  }

  /**
   * Send a remote task and optionally wait for `task_response` via mailbox polling.
   * The `from` agent must be registered on the server (mailbox) to receive responses.
   */
  async sendTask(params: RemoteSendTaskParams): Promise<AgentTaskResult> {
    const waitForResponse = params.waitForResponse ?? true;
    const request = buildTaskRequest({
      from: params.from,
      capability: params.capability,
      input: params.input,
      ...(params.traceId !== undefined ? { traceId: params.traceId } : {}),
      ...(params.to !== undefined ? { to: params.to } : {}),
      ...(params.deadline_ms !== undefined ? { deadline_ms: params.deadline_ms } : {}),
    });

    await this.send(request);

    if (!waitForResponse) {
      return { status: 'success', request };
    }

    const response = await this.waitForTaskResponse(
      params.from,
      request.message_id,
      params.responseTimeoutMs ?? this.timeoutMs,
      params.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    );

    const status = response.status;
    return {
      status,
      request,
      response,
      ...(response.output !== undefined ? { output: response.output } : {}),
      ...(response.error !== undefined ? { error: response.error } : {}),
    };
  }

  /**
   * Run a registered DAG workflow on the server (`POST /workflows/:id/run`).
   * Week 3 Day 21 — remote coordinator for structured task chains.
   */
  async runWorkflow(
    workflowId: string,
    input: Record<string, unknown> = {},
  ): Promise<WorkflowRunRemoteResult> {
    const response = await this.request<{ ok: true; result: WorkflowRunRemoteResult }>({
      method: 'POST',
      path: `/workflows/${encodeURIComponent(workflowId)}/run`,
      body: { input },
    });

    if (!response?.result) {
      throw new OacpClientError(
        CLIENT_ERROR_CODES.INVALID_RESPONSE,
        `Empty workflow run response for "${workflowId}"`,
      );
    }

    return response.result;
  }

  private async waitForTaskResponse(
    agentId: string,
    requestMessageId: string,
    timeoutMs: number,
    pollIntervalMs: number,
  ): Promise<TaskResponseMessage> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const waitMs = Math.min(Math.max(remaining, pollIntervalMs), 5_000);
      const message = await this.receiveMessage(agentId, { timeoutMs: waitMs });

      if (message?.type === 'task_response' && message.in_reply_to === requestMessageId) {
        return message;
      }

      if (remaining <= 0) {
        break;
      }

      await sleep(pollIntervalMs);
    }

    throw new OacpClientError(
      CLIENT_ERROR_CODES.RESPONSE_TIMEOUT,
      `Timed out waiting for task_response to "${requestMessageId}"`,
      { details: [{ path: '/in_reply_to', message: `No response within ${String(timeoutMs)}ms` }] },
    );
  }

  private request<T>(options: {
    method: 'GET' | 'POST';
    path: string;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
    timeoutMs?: number;
  }): Promise<T | null> {
    return httpJsonRequest<T>(this.baseUrl, {
      method: options.method,
      path: options.path,
      ...(options.body !== undefined ? { body: options.body } : {}),
      ...(options.query !== undefined ? { query: options.query } : {}),
      timeoutMs: options.timeoutMs ?? this.timeoutMs,
      headers: this.headers,
      fetchFn: this.fetchFn,
      retryPolicy: this.retryPolicy,
    });
  }
}

/** Create an {@link AgentClient} for a server base URL. */
export function createAgentClient(
  baseUrl: string,
  options: Omit<AgentClientOptions, 'baseUrl'> = {},
): AgentClient {
  return new AgentClient({ baseUrl, ...options });
}
