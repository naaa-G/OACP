import type { OacpMessage } from '../protocol/message-schemas.js';
import {
  applyMessageToDelegationGraph,
  createMutableDelegationGraphState,
  delegationTopologicalOrder,
  finalizeDelegationGraph,
  getDelegationAncestors,
  getDelegationDescendants,
} from './delegation-graph-builder.js';
import type {
  DelegationGraph,
  DelegationGraphStore,
  DelegationNode,
  RecordDelegationMessageOptions,
} from './delegation-graph-types.js';

/**
 * In-memory delegation graph store for single-process and test deployments.
 * Production servers may rebuild from `MemoryStore` or share this instance.
 */
export class InMemoryDelegationGraphStore implements DelegationGraphStore {
  private readonly traces = new Map<string, ReturnType<typeof createMutableDelegationGraphState>>();

  recordMessage(message: OacpMessage, options: RecordDelegationMessageOptions = {}): Promise<void> {
    let state = this.traces.get(message.trace_id);
    if (!state) {
      state = createMutableDelegationGraphState(message.trace_id);
      this.traces.set(message.trace_id, state);
    }
    applyMessageToDelegationGraph(state, message, options);
    return Promise.resolve();
  }

  getGraph(traceId: string): Promise<DelegationGraph | undefined> {
    const state = this.traces.get(traceId);
    if (!state || state.nodes.size === 0) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(finalizeDelegationGraph(state));
  }

  async getAncestors(traceId: string, messageId: string): Promise<readonly DelegationNode[]> {
    const graph = await this.getGraph(traceId);
    if (!graph) {
      return [];
    }
    return getDelegationAncestors(graph, messageId);
  }

  async getDescendants(traceId: string, messageId: string): Promise<readonly DelegationNode[]> {
    const graph = await this.getGraph(traceId);
    if (!graph) {
      return [];
    }
    return getDelegationDescendants(graph, messageId);
  }

  async topologicalOrder(traceId: string): Promise<readonly string[]> {
    const graph = await this.getGraph(traceId);
    if (!graph) {
      return [];
    }
    return delegationTopologicalOrder(graph);
  }

  clear(): Promise<void> {
    this.traces.clear();
    return Promise.resolve();
  }
}

export function createInMemoryDelegationGraphStore(): InMemoryDelegationGraphStore {
  return new InMemoryDelegationGraphStore();
}
