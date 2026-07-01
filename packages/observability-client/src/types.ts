/** JSON Web Key public key material (RFC 7517 subset). */
export interface JsonWebKeyPublic {
  readonly kty: string;
  readonly crv?: string;
  readonly x?: string;
  readonly y?: string;
  readonly n?: string;
  readonly e?: string;
  readonly kid?: string;
  readonly use?: 'sig' | 'enc';
  readonly alg?: string;
  readonly [key: string]: unknown;
}

export type PublicKeyMaterial = string | JsonWebKeyPublic;

/** Agent identity as returned by the registry / snapshot API. */
export interface AgentIdentity {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly capabilities: readonly string[];
  readonly publicKey: PublicKeyMaterial;
  readonly description?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Agent row enriched for Console observability (Day 9+ server fields).
 * Day 3: mirrors `AgentIdentity`; optional runtime fields populate when server sends them.
 */
export interface AgentObservabilityRecord extends AgentIdentity {
  readonly fleet?: string;
  readonly role?: string;
  readonly status?: 'idle' | 'active' | 'error' | 'offline';
  readonly last_seen_at?: string;
  readonly active_trace_ids?: readonly string[];
  readonly message_count_24h?: number;
}

export interface TraceListEntry {
  readonly traceId: string;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly messageCount: number;
  readonly messageTypes: readonly string[];
  readonly agents: readonly string[];
  readonly status?: 'running' | 'completed' | 'failed';
  readonly completedAt?: string;
}

export interface TraceTimelineEvent {
  readonly index: number;
  readonly timestamp: string;
  readonly type: string;
  readonly from: string;
  readonly to?: string;
  readonly capability?: string;
  readonly status?: string;
  readonly message_id: string;
  readonly summary: string;
}

export interface TraceBundle {
  readonly trace_id: string;
  readonly started_at: string;
  readonly last_activity_at: string;
  readonly message_count: number;
  readonly message_types: readonly string[];
  readonly agents: readonly string[];
  readonly timeline: readonly TraceTimelineEvent[];
  readonly graph?: unknown;
  readonly memory_entries?: readonly unknown[];
}

/** Delegation edge aggregated for graph rendering. */
export interface AgentLink {
  readonly from_agent: string;
  readonly to_agent: string;
  readonly kind: string;
  readonly capability?: string;
  readonly message_count: number;
}

export type TraceGraphLayoutHint = 'hierarchical';

/** Trace-scoped agent node for Ops 2D graph (Day 26). */
export interface TraceGraphNode {
  readonly agent_id: string;
  readonly name: string;
  readonly depth: number;
  readonly fleet?: string;
  readonly role?: string;
  readonly status: 'idle' | 'active' | 'error' | 'offline';
  readonly capabilities: readonly string[];
}

export interface TraceGraphEdge {
  readonly from_agent: string;
  readonly to_agent: string;
  readonly kind: string;
  readonly capability?: string;
  readonly message_count: number;
}

/** Agent-centric trace graph payload from `GET /v1/observability/traces/:id/graph`. */
export interface TraceGraphView {
  readonly trace_id: string;
  readonly layout: TraceGraphLayoutHint;
  readonly max_depth: number;
  readonly nodes: readonly TraceGraphNode[];
  readonly edges: readonly TraceGraphEdge[];
}

export interface TraceGraphResponse {
  readonly ok: true;
  readonly graph: TraceGraphView;
}

export interface PlaygroundSnapshot {
  readonly server: {
    readonly status: 'healthy';
    readonly protocol_version: string;
    readonly registered_agents: number;
    readonly bus_open: boolean;
  };
  readonly agents: readonly AgentObservabilityRecord[];
  readonly traces: readonly TraceListEntry[];
  readonly trace_count: number;
  readonly active_trace?: TraceBundle;
  readonly agent_links: readonly AgentLink[];
}

export interface PlaygroundSnapshotResponse {
  readonly ok: true;
  readonly snapshot: PlaygroundSnapshot;
}

export interface PlaygroundSnapshotErrorBody {
  readonly ok: false;
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
  };
}

export interface SnapshotStats {
  readonly agentCount: number;
  readonly traceCount: number;
  readonly messageCount: number;
}

/** Derive header stat tiles from a snapshot. */
export function snapshotStats(snapshot: PlaygroundSnapshot): SnapshotStats {
  return {
    agentCount: snapshot.server.registered_agents,
    traceCount: snapshot.trace_count,
    messageCount: snapshot.active_trace?.message_count ?? 0,
  };
}
