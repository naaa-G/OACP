import type { OacpMessage } from '../protocol/message-schemas.js';
import type { MemoryEntry, MemoryStore } from './types.js';
import { buildDelegationGraphFromMemoryEntries } from './delegation-graph-builder.js';
import type {
  DelegationGraph,
  DelegationGraphStore,
  RecordDelegationMessageOptions,
} from './delegation-graph-types.js';
import { createInMemoryDelegationGraphStore } from './in-memory-delegation-graph-store.js';

export interface DelegationGraphRecorderOptions {
  readonly store?: DelegationGraphStore;
}

/**
 * Records delegation and subtask relationships for observability and workflow analysis.
 * Complements `TaskMemoryRecorder` (Day 15) with structured graph queries.
 */
export class DelegationGraphRecorder {
  private readonly store: DelegationGraphStore;

  constructor(options: DelegationGraphRecorderOptions = {}) {
    this.store = options.store ?? createInMemoryDelegationGraphStore();
  }

  get graphStore(): DelegationGraphStore {
    return this.store;
  }

  /** Record a protocol message into the delegation graph. */
  async recordMessage(
    message: OacpMessage,
    options?: RecordDelegationMessageOptions,
  ): Promise<void> {
    await this.store.recordMessage(message, options);
  }

  async getGraph(traceId: string): Promise<DelegationGraph | undefined> {
    return this.store.getGraph(traceId);
  }

  /** Rebuild a graph from persisted memory entries (e.g. after server restart). */
  async buildFromMemoryStore(
    memoryStore: MemoryStore,
    traceId: string,
  ): Promise<DelegationGraph | undefined> {
    const entries = await memoryStore.query({ trace_id: traceId, limit: 1000 });
    return buildDelegationGraphFromMemoryEntries(entries);
  }

  /** Rebuild a graph from in-memory memory entries. */
  buildFromEntries(entries: readonly MemoryEntry[]): DelegationGraph | undefined {
    return buildDelegationGraphFromMemoryEntries(entries);
  }
}

export function createDelegationGraphRecorder(
  options?: DelegationGraphRecorderOptions,
): DelegationGraphRecorder {
  return new DelegationGraphRecorder(options);
}
