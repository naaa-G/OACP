import type { AgentIdentity, OacpMessage } from '@oacp/core';

export type MessageRoutingMode = 'direct' | 'capability';

export interface MessageRoutingInfo {
  readonly mode: MessageRoutingMode;
  readonly capability?: string;
  readonly selected_agent?: string;
  readonly routing_mode?: 'first' | 'all';
}

export interface SendMessageResult {
  readonly ok: true;
  readonly message_id: string;
  readonly trace_id: string;
  readonly type: string;
  readonly recipients: readonly string[];
  readonly routing?: MessageRoutingInfo;
}

export interface HealthCheckResult {
  readonly ok: true;
  readonly status: string;
  readonly protocol_version: string;
  readonly registered_agents: number;
  readonly bus_open: boolean;
}

export interface ReceiveMessageResult {
  readonly ok: true;
  readonly message: OacpMessage;
}

/** Parameters for remote `sendTask()` over HTTP. */
export interface RemoteSendTaskParams {
  /** Sender agent URI (must be registered on the server to receive responses). */
  readonly from: string;
  readonly capability: string;
  readonly input: Record<string, unknown>;
  readonly to?: string;
  readonly deadline_ms?: number;
  readonly traceId?: string;
  /** Wait for correlated `task_response` via mailbox polling (default: `true`). */
  readonly waitForResponse?: boolean;
  readonly responseTimeoutMs?: number;
  readonly pollIntervalMs?: number;
}

export interface RegisterAgentOptions {
  readonly replace?: boolean;
}

export interface CapabilityDiscoveryResult {
  readonly ok: true;
  readonly capability: string;
  readonly agents: readonly AgentIdentity[];
  readonly count: number;
}

export interface ListAgentsOptions {
  readonly capability?: string;
  readonly limit?: number;
}

export interface FindAgentsByCapabilityOptions {
  readonly limit?: number;
}

export interface WorkflowRunRemoteResult {
  readonly ok: boolean;
  readonly runId: string;
  readonly traceId: string;
  readonly workflowId: string;
  readonly steps: readonly {
    readonly stepId: string;
    readonly capability: string;
    readonly from: string;
    readonly status: string;
    readonly output?: Record<string, unknown>;
  }[];
  readonly output?: Record<string, unknown>;
  readonly error?: { readonly code: string; readonly message: string };
}

export type { AgentIdentity };
