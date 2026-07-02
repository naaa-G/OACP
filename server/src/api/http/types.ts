import type {
  AgentIdentity,
  DelegationGraph,
  InMemoryMessageBus,
  MemoryEntry,
  MemoryStore,
  OacpMessage,
  TraceBundle,
  TraceListEntry,
  WorkflowDefinition,
  WorkflowRunRecord,
  WorkflowRunResult,
} from '@oacp/core';
import type { DelegationGraphRecorder, TaskMemoryRecorder, WorkflowEngine } from '@oacp/core';

import type { AgentRegistry } from '../../registry/agent-registry.js';

import type { CapabilityRouter } from '../../routing/capability-router.js';
import type { PlaygroundSnapshot } from '../../observability/playground-service.js';
import type { TraceGraphView } from '../../observability/trace-graph.js';
import type { ObservabilityEventBus } from '../../observability/observability-event-bus.js';
import type { ObservabilityPersistence } from '../../observability/observability-persistence.js';

/** Bus + registry surface used by routing orchestration. */
export interface RoutingContext {
  readonly bus: InMemoryMessageBus;
  readonly registry: AgentRegistry;
}

/** Shared application context wired into HTTP handlers. */
export interface ServerContext extends RoutingContext {
  readonly capabilityRouter: CapabilityRouter;
  readonly memoryStore: MemoryStore;
  readonly taskRecorder: TaskMemoryRecorder;
  readonly delegationGraphRecorder: DelegationGraphRecorder;
  readonly workflowEngine: WorkflowEngine;
  readonly observabilityEventBus: ObservabilityEventBus;
  readonly observabilityPersistence: ObservabilityPersistence;
}

export type MessageRoutingMode = 'direct' | 'capability';

/** Routing metadata returned on successful message send (Day 11). */
export interface MessageRoutingInfo {
  readonly mode: MessageRoutingMode;
  readonly capability?: string;
  readonly selected_agent?: string;
  readonly routing_mode?: 'first' | 'all';
}

export interface SendMessageSuccessResponse {
  readonly ok: true;
  readonly message_id: string;
  readonly trace_id: string;
  readonly type: string;
  readonly recipients: readonly string[];
  readonly routing?: MessageRoutingInfo;
}

export interface RegisterAgentRequest {
  readonly identity: AgentIdentity;
  readonly replace?: boolean;
}

export interface RegisterAgentResponse {
  readonly ok: true;
  readonly agent: AgentIdentity;
}

export interface AgentLookupResponse {
  readonly ok: true;
  readonly agent: AgentIdentity;
}

export interface HealthResponse {
  readonly ok: true;
  readonly status: 'healthy';
  readonly protocol_version: string;
  readonly registered_agents: number;
  readonly bus_open: boolean;
}

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

export interface ReceiveMessageResponse {
  readonly ok: true;
  readonly message: OacpMessage;
}

export interface AgentsListResponse {
  readonly ok: true;
  readonly agents: readonly AgentIdentity[];
}

export interface CapabilityDiscoveryResponse {
  readonly ok: true;
  readonly capability: string;
  readonly agents: readonly AgentIdentity[];
  readonly count: number;
}

export interface MemoryScopesResponse {
  readonly ok: true;
  readonly scopes: readonly string[];
}

export interface MemoryEntriesResponse {
  readonly ok: true;
  readonly entries: readonly MemoryEntry[];
  readonly count: number;
}

export interface MemoryEntryResponse {
  readonly ok: true;
  readonly entry: MemoryEntry;
}

export interface DelegationGraphResponse {
  readonly ok: true;
  readonly graph: DelegationGraph;
}

export interface TraceListResponse {
  readonly ok: true;
  readonly traces: readonly TraceListEntry[];
  readonly count: number;
  readonly total: number;
}

export interface TraceDetailResponse {
  readonly ok: true;
  readonly trace: TraceBundle;
}

export interface PlaygroundSnapshotResponse {
  readonly ok: true;
  readonly snapshot: PlaygroundSnapshot;
}

export interface TraceGraphResponse {
  readonly ok: true;
  readonly graph: TraceGraphView;
}

/** v1 alias — identical envelope to {@link PlaygroundSnapshotResponse}. */
export type ObservabilitySnapshotResponse = PlaygroundSnapshotResponse;

export interface WorkflowsListResponse {
  readonly ok: true;
  readonly workflows: readonly WorkflowDefinition[];
  readonly count: number;
}

export interface WorkflowRunResponse {
  readonly ok: true;
  readonly result: WorkflowRunResult;
}

export interface WorkflowRunRecordResponse {
  readonly ok: true;
  readonly run: WorkflowRunRecord;
}
