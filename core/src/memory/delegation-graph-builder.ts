import type {
  DelegationMessage,
  OacpMessage,
  TaskRequestMessage,
  TaskResponseMessage,
} from '../protocol/message-schemas.js';
import type { MemoryEntry } from './types.js';
import type {
  DelegationEdge,
  DelegationEdgeKind,
  DelegationGraph,
  DelegationNode,
  RecordDelegationMessageOptions,
} from './delegation-graph-types.js';

const DELEGATION_PARENT_EDGE_KINDS = new Set<DelegationEdgeKind>(['delegates', 'subtask']);

/** Mutable graph state used by incremental stores and batch builders. */
export interface MutableDelegationGraphState {
  readonly traceId: string;
  readonly nodes: Map<string, DelegationNode>;
  readonly edges: DelegationEdge[];
}

export function createMutableDelegationGraphState(traceId: string): MutableDelegationGraphState {
  return {
    traceId,
    nodes: new Map(),
    edges: [],
  };
}

function upsertNode(state: MutableDelegationGraphState, node: DelegationNode): void {
  const existing = state.nodes.get(node.message_id);
  if (!existing) {
    state.nodes.set(node.message_id, node);
    return;
  }

  const merged: DelegationNode = {
    message_id: existing.message_id,
    trace_id: existing.trace_id,
    agent_id: existing.agent_id,
    kind: node.kind,
    ...(node.capability !== undefined || existing.capability !== undefined
      ? { capability: node.capability ?? existing.capability }
      : {}),
    ...(node.to !== undefined || existing.to !== undefined ? { to: node.to ?? existing.to } : {}),
    ...(node.status !== undefined || existing.status !== undefined
      ? { status: node.status ?? existing.status }
      : {}),
    ...(node.timestamp !== undefined || existing.timestamp !== undefined
      ? { timestamp: node.timestamp ?? existing.timestamp }
      : {}),
    ...(node.parent_message_id !== undefined || existing.parent_message_id !== undefined
      ? { parent_message_id: node.parent_message_id ?? existing.parent_message_id }
      : {}),
  };
  state.nodes.set(node.message_id, merged);
}

function addEdge(state: MutableDelegationGraphState, edge: DelegationEdge): void {
  const duplicate = state.edges.some(
    (existing) =>
      existing.from_message_id === edge.from_message_id &&
      existing.to_message_id === edge.to_message_id &&
      existing.kind === edge.kind,
  );
  if (!duplicate) {
    state.edges.push(edge);
  }
}

function agentForMessage(
  state: MutableDelegationGraphState,
  messageId: string,
): string | undefined {
  return state.nodes.get(messageId)?.agent_id;
}

/** Apply a protocol message to mutable graph state. */
export function applyMessageToDelegationGraph(
  state: MutableDelegationGraphState,
  message: OacpMessage,
  options: RecordDelegationMessageOptions = {},
): void {
  if (message.type === 'task_request') {
    applyTaskRequest(state, message, options.parentMessageId);
    return;
  }
  if (message.type === 'delegation') {
    applyDelegation(state, message);
    return;
  }
  if (message.type === 'task_response') {
    applyTaskResponse(state, message);
  }
}

function applyTaskRequest(
  state: MutableDelegationGraphState,
  message: TaskRequestMessage,
  parentMessageId?: string,
): void {
  upsertNode(state, {
    message_id: message.message_id,
    trace_id: message.trace_id,
    agent_id: message.from,
    kind: 'task_request',
    capability: message.capability,
    ...(message.to !== undefined ? { to: message.to } : {}),
    timestamp: message.timestamp,
    ...(parentMessageId !== undefined ? { parent_message_id: parentMessageId } : {}),
  });

  if (parentMessageId !== undefined) {
    addEdge(state, {
      from_message_id: parentMessageId,
      to_message_id: message.message_id,
      trace_id: message.trace_id,
      kind: 'subtask',
      from_agent: agentForMessage(state, parentMessageId) ?? message.from,
      ...(message.to !== undefined ? { to_agent: message.to } : {}),
      capability: message.capability,
    });
  }
}

function applyDelegation(state: MutableDelegationGraphState, message: DelegationMessage): void {
  upsertNode(state, {
    message_id: message.message_id,
    trace_id: message.trace_id,
    agent_id: message.from,
    kind: 'delegation',
    capability: message.capability,
    ...(message.to !== undefined ? { to: message.to } : {}),
    timestamp: message.timestamp,
    parent_message_id: message.parent_message_id,
  });

  addEdge(state, {
    from_message_id: message.parent_message_id,
    to_message_id: message.message_id,
    trace_id: message.trace_id,
    kind: 'delegates',
    from_agent: agentForMessage(state, message.parent_message_id) ?? message.from,
    ...(message.to !== undefined ? { to_agent: message.to } : {}),
    capability: message.capability,
  });
}

function applyTaskResponse(state: MutableDelegationGraphState, message: TaskResponseMessage): void {
  upsertNode(state, {
    message_id: message.message_id,
    trace_id: message.trace_id,
    agent_id: message.from,
    kind: 'task_response',
    status: message.status,
    timestamp: message.timestamp,
    parent_message_id: message.in_reply_to,
  });

  addEdge(state, {
    from_message_id: message.in_reply_to,
    to_message_id: message.message_id,
    trace_id: message.trace_id,
    kind: 'responds_to',
    from_agent: agentForMessage(state, message.in_reply_to) ?? message.from,
    to_agent: message.from,
  });
}

/** Apply a persisted memory entry (reconstructs graph from Day 15 history). */
export function applyMemoryEntryToDelegationGraph(
  state: MutableDelegationGraphState,
  entry: MemoryEntry,
): void {
  if (!entry.message_id) {
    return;
  }

  if (entry.kind === 'task_request') {
    const parentMessageId =
      typeof entry.payload.parent_message_id === 'string'
        ? entry.payload.parent_message_id
        : undefined;
    upsertNode(state, {
      message_id: entry.message_id,
      trace_id: entry.trace_id,
      agent_id: entry.agent_id,
      kind: 'task_request',
      ...(entry.capability !== undefined ? { capability: entry.capability } : {}),
      ...(typeof entry.payload.to === 'string' ? { to: entry.payload.to } : {}),
      timestamp: entry.created_at,
      ...(parentMessageId !== undefined ? { parent_message_id: parentMessageId } : {}),
    });
    if (parentMessageId !== undefined) {
      addEdge(state, {
        from_message_id: parentMessageId,
        to_message_id: entry.message_id,
        trace_id: entry.trace_id,
        kind: 'subtask',
        from_agent: agentForMessage(state, parentMessageId) ?? entry.agent_id,
        ...(typeof entry.payload.to === 'string' ? { to_agent: entry.payload.to } : {}),
        ...(entry.capability !== undefined ? { capability: entry.capability } : {}),
      });
    }
    return;
  }

  if (entry.kind === 'delegation') {
    const parentMessageId =
      typeof entry.payload.parent_message_id === 'string'
        ? entry.payload.parent_message_id
        : undefined;
    if (!parentMessageId) {
      return;
    }
    upsertNode(state, {
      message_id: entry.message_id,
      trace_id: entry.trace_id,
      agent_id: entry.agent_id,
      kind: 'delegation',
      ...(entry.capability !== undefined ? { capability: entry.capability } : {}),
      ...(typeof entry.payload.to === 'string' ? { to: entry.payload.to } : {}),
      timestamp: entry.created_at,
      parent_message_id: parentMessageId,
    });
    addEdge(state, {
      from_message_id: parentMessageId,
      to_message_id: entry.message_id,
      trace_id: entry.trace_id,
      kind: 'delegates',
      from_agent: agentForMessage(state, parentMessageId) ?? entry.agent_id,
      ...(typeof entry.payload.to === 'string' ? { to_agent: entry.payload.to } : {}),
      ...(entry.capability !== undefined ? { capability: entry.capability } : {}),
    });
    return;
  }

  if (entry.kind === 'task_response' || entry.kind === 'output') {
    const inReplyTo =
      typeof entry.payload.in_reply_to === 'string' ? entry.payload.in_reply_to : undefined;
    if (!inReplyTo) {
      return;
    }
    upsertNode(state, {
      message_id: entry.message_id,
      trace_id: entry.trace_id,
      agent_id: entry.agent_id,
      kind: 'task_response',
      ...(entry.status !== undefined ? { status: entry.status } : {}),
      timestamp: entry.created_at,
      parent_message_id: inReplyTo,
    });
    addEdge(state, {
      from_message_id: inReplyTo,
      to_message_id: entry.message_id,
      trace_id: entry.trace_id,
      kind: 'responds_to',
      from_agent: agentForMessage(state, inReplyTo) ?? entry.agent_id,
      to_agent: entry.agent_id,
    });
  }
}

/** Finalize mutable state into an immutable `DelegationGraph`. */
export function finalizeDelegationGraph(state: MutableDelegationGraphState): DelegationGraph {
  const nodes = [...state.nodes.values()];
  const edges = [...state.edges];

  const childTargets = new Set(
    edges
      .filter((edge) => DELEGATION_PARENT_EDGE_KINDS.has(edge.kind))
      .map((edge) => edge.to_message_id),
  );
  const parentSources = new Set(
    edges
      .filter((edge) => DELEGATION_PARENT_EDGE_KINDS.has(edge.kind))
      .map((edge) => edge.from_message_id),
  );

  const workNodes = nodes.filter(
    (node): node is DelegationNode => node.kind === 'task_request' || node.kind === 'delegation',
  );

  const roots = workNodes
    .filter((node) => !childTargets.has(node.message_id))
    .map((node) => node.message_id);

  const leaves = workNodes
    .filter((node) => !parentSources.has(node.message_id))
    .map((node) => node.message_id);

  return {
    trace_id: state.traceId,
    nodes,
    edges,
    roots,
    leaves,
    depth: computeDelegationDepth(roots, edges),
  };
}

function computeDelegationDepth(
  roots: readonly string[],
  edges: readonly DelegationEdge[],
): number {
  if (roots.length === 0) {
    return 0;
  }

  const children = new Map<string, string[]>();
  for (const edge of edges) {
    if (!DELEGATION_PARENT_EDGE_KINDS.has(edge.kind)) {
      continue;
    }
    const list = children.get(edge.from_message_id) ?? [];
    list.push(edge.to_message_id);
    children.set(edge.from_message_id, list);
  }

  let maxDepth = 0;
  for (const root of roots) {
    maxDepth = Math.max(maxDepth, depthFrom(root, children, new Set()));
  }
  return maxDepth;
}

function depthFrom(nodeId: string, children: Map<string, string[]>, visited: Set<string>): number {
  if (visited.has(nodeId)) {
    return 0;
  }
  visited.add(nodeId);

  const childIds = children.get(nodeId) ?? [];
  if (childIds.length === 0) {
    return 1;
  }

  let maxChild = 0;
  for (const childId of childIds) {
    maxChild = Math.max(maxChild, depthFrom(childId, children, visited));
  }
  return 1 + maxChild;
}

/** Build a graph from trace messages in delivery order. */
export function buildDelegationGraphFromMessages(
  messages: readonly OacpMessage[],
): DelegationGraph | undefined {
  if (messages.length === 0) {
    return undefined;
  }

  const traceId = messages[0]?.trace_id;
  if (!traceId) {
    return undefined;
  }

  const state = createMutableDelegationGraphState(traceId);
  for (const message of messages) {
    applyMessageToDelegationGraph(state, message);
  }
  return finalizeDelegationGraph(state);
}

/** Build a graph from persisted memory entries (Day 15 reconstruction). */
export function buildDelegationGraphFromMemoryEntries(
  entries: readonly MemoryEntry[],
): DelegationGraph | undefined {
  if (entries.length === 0) {
    return undefined;
  }

  const traceId = entries[0]?.trace_id;
  if (!traceId) {
    return undefined;
  }

  const state = createMutableDelegationGraphState(traceId);
  for (const entry of entries) {
    applyMemoryEntryToDelegationGraph(state, entry);
  }
  return finalizeDelegationGraph(state);
}

/** Walk parent delegation/subtask edges from a node toward roots. */
export function getDelegationAncestors(
  graph: DelegationGraph,
  messageId: string,
): readonly DelegationNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.message_id, node]));
  const parentEdges = graph.edges.filter((edge) => DELEGATION_PARENT_EDGE_KINDS.has(edge.kind));
  const ancestors: DelegationNode[] = [];
  const visited = new Set<string>();
  let current = messageId;

  for (;;) {
    const parentEdge = parentEdges.find((edge) => edge.to_message_id === current);
    if (!parentEdge || visited.has(parentEdge.from_message_id)) {
      break;
    }
    visited.add(parentEdge.from_message_id);
    const parent = byId.get(parentEdge.from_message_id);
    if (parent) {
      ancestors.push(parent);
    }
    current = parentEdge.from_message_id;
  }

  return ancestors;
}

/** Walk child delegation/subtask edges from a node toward leaves. */
export function getDelegationDescendants(
  graph: DelegationGraph,
  messageId: string,
): readonly DelegationNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.message_id, node]));
  const parentEdges = graph.edges.filter((edge) => DELEGATION_PARENT_EDGE_KINDS.has(edge.kind));
  const descendants: DelegationNode[] = [];
  const queue = [messageId];
  const visited = new Set<string>([messageId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const edge of parentEdges) {
      if (edge.from_message_id !== current || visited.has(edge.to_message_id)) {
        continue;
      }
      visited.add(edge.to_message_id);
      const child = byId.get(edge.to_message_id);
      if (child) {
        descendants.push(child);
      }
      queue.push(edge.to_message_id);
    }
  }

  return descendants;
}

/** Topological order of work nodes (roots first) along delegation/subtask edges. */
export function delegationTopologicalOrder(graph: DelegationGraph): readonly string[] {
  const workNodeIds = new Set(
    graph.nodes
      .filter((node) => node.kind === 'task_request' || node.kind === 'delegation')
      .map((node) => node.message_id),
  );

  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();

  for (const nodeId of workNodeIds) {
    inDegree.set(nodeId, 0);
  }

  for (const edge of graph.edges) {
    if (!DELEGATION_PARENT_EDGE_KINDS.has(edge.kind)) {
      continue;
    }
    if (!workNodeIds.has(edge.from_message_id) || !workNodeIds.has(edge.to_message_id)) {
      continue;
    }
    inDegree.set(edge.to_message_id, (inDegree.get(edge.to_message_id) ?? 0) + 1);
    const list = children.get(edge.from_message_id) ?? [];
    list.push(edge.to_message_id);
    children.set(edge.from_message_id, list);
  }

  const queue = graph.roots.filter((root) => workNodeIds.has(root));
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    order.push(current);

    for (const childId of children.get(current) ?? []) {
      const nextDegree = (inDegree.get(childId) ?? 1) - 1;
      inDegree.set(childId, nextDegree);
      if (nextDegree === 0) {
        queue.push(childId);
      }
    }
  }

  for (const nodeId of workNodeIds) {
    if (!order.includes(nodeId)) {
      order.push(nodeId);
    }
  }

  return order;
}
