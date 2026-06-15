import type { OacpMessage } from '../protocol/message-schemas.js';
import type { TaskStatus } from '../protocol/message-types.js';

/** Node kinds that participate in a delegation graph. */
export type DelegationNodeKind = 'task_request' | 'delegation' | 'task_response';

/** Relationship between correlated messages in a trace. */
export type DelegationEdgeKind = 'delegates' | 'subtask' | 'responds_to';

/** A message vertex in a trace delegation graph. */
export interface DelegationNode {
  readonly message_id: string;
  readonly trace_id: string;
  readonly agent_id: string;
  readonly kind: DelegationNodeKind;
  readonly capability?: string;
  readonly to?: string;
  readonly status?: TaskStatus;
  readonly timestamp?: string;
  readonly parent_message_id?: string;
}

/** Directed edge between two correlated messages. */
export interface DelegationEdge {
  readonly from_message_id: string;
  readonly to_message_id: string;
  readonly trace_id: string;
  readonly kind: DelegationEdgeKind;
  readonly from_agent: string;
  readonly to_agent?: string;
  readonly capability?: string;
}

/** Materialized delegation graph for a single `trace_id`. */
export interface DelegationGraph {
  readonly trace_id: string;
  readonly nodes: readonly DelegationNode[];
  readonly edges: readonly DelegationEdge[];
  /** Root task/delegation nodes with no parent subtask or delegation edge. */
  readonly roots: readonly string[];
  /** Nodes with no outgoing `delegates` or `subtask` edges. */
  readonly leaves: readonly string[];
  /** Maximum depth from any root along delegation/subtask edges. */
  readonly depth: number;
}

/** Options when recording a message into the delegation graph. */
export interface RecordDelegationMessageOptions {
  /** Parent for `sendSubTask` chains (not present on the protocol envelope). */
  readonly parentMessageId?: string;
}

/** Pluggable store for incremental delegation graph recording. */
export interface DelegationGraphStore {
  recordMessage(message: OacpMessage, options?: RecordDelegationMessageOptions): Promise<void>;
  getGraph(traceId: string): Promise<DelegationGraph | undefined>;
  getAncestors(traceId: string, messageId: string): Promise<readonly DelegationNode[]>;
  getDescendants(traceId: string, messageId: string): Promise<readonly DelegationNode[]>;
  topologicalOrder(traceId: string): Promise<readonly string[]>;
  clear(): Promise<void>;
}
