import type { DelegationGraph, DelegationNode } from '../memory/delegation-graph-types.js';
import { PROTOCOL_VERSION } from '../protocol/constants.js';
import type { OacpMessage } from '../protocol/message-schemas.js';

/** Reconstruct minimal protocol messages from delegation graph nodes (post-restart fallback). */
export function messagesFromDelegationGraph(graph: DelegationGraph): readonly OacpMessage[] {
  const sorted = [...graph.nodes].sort((a, b) =>
    (a.timestamp ?? '').localeCompare(b.timestamp ?? ''),
  );

  return sorted.map((node) => nodeToMessage(node, graph.trace_id));
}

function nodeToMessage(node: DelegationNode, traceId: string): OacpMessage {
  const timestamp = node.timestamp ?? new Date(0).toISOString();
  const base = {
    version: PROTOCOL_VERSION,
    message_id: node.message_id,
    trace_id: traceId,
    from: node.agent_id,
    timestamp,
  };

  if (node.kind === 'task_response') {
    return {
      ...base,
      type: 'task_response',
      in_reply_to: node.parent_message_id ?? '',
      status: node.status ?? 'success',
    };
  }

  if (node.kind === 'delegation') {
    return {
      ...base,
      type: 'delegation',
      parent_message_id: node.parent_message_id ?? '',
      capability: node.capability ?? 'unknown',
      input: {},
      ...(node.to !== undefined ? { to: node.to } : {}),
    };
  }

  return {
    ...base,
    type: 'task_request',
    capability: node.capability ?? 'unknown',
    input: {},
    ...(node.to !== undefined ? { to: node.to } : {}),
  };
}
