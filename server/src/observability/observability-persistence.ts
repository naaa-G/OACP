import type { AgentIdentity, OacpMessage, TraceListEntry } from '@oacp/core';

/** Persisted observability surface for traces and agent registry (Day 53). */
export interface ObservabilityPersistence {
  readonly enabled: boolean;
  upsertAgent(identity: AgentIdentity, options?: { lastSeenAt?: string }): void;
  touchAgentLastSeen(agentId: string, timestamp: string): void;
  getAgentLastSeen(agentId: string): string | undefined;
  listAgents(): readonly AgentIdentity[];
  appendMessage(message: OacpMessage): boolean;
  hasMessage(messageId: string): boolean;
  hasTrace(traceId: string): boolean;
  listTraceIds(): readonly string[];
  listTraces(options?: { limit?: number; offset?: number }): readonly TraceListEntry[];
  getTraceMessages(traceId: string): readonly OacpMessage[];
  close(): Promise<void>;
}

export interface ObservabilityImportTrace {
  readonly trace_id: string;
  readonly agents?: readonly AgentIdentity[] | undefined;
  readonly messages: readonly OacpMessage[];
  readonly completed_at?: string | undefined;
  readonly source?: string | undefined;
}

export interface ObservabilityImportResult {
  readonly trace_id: string;
  readonly imported_messages: number;
  readonly skipped_messages: number;
  readonly registered_agents: number;
}

/** MCPLab export envelope consumed by startup backfill (Day 53). */
export interface McplabObservabilityExportBundle {
  readonly ok: true;
  readonly exports: readonly ObservabilityImportTrace[];
}
