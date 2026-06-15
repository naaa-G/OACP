import { randomUUID } from 'node:crypto';

import { MEMORY_ERROR_CODES, OacpMemoryError } from './errors.js';
import type { MemoryEntry, MemoryEntryInput, MemoryQuery, MemoryStore } from './types.js';

function compareCreatedAt(a: MemoryEntry, b: MemoryEntry): number {
  return a.created_at.localeCompare(b.created_at);
}

function matchesQuery(entry: MemoryEntry, query: MemoryQuery): boolean {
  if (query.scope !== undefined && entry.scope !== query.scope) {
    return false;
  }
  if (query.trace_id !== undefined && entry.trace_id !== query.trace_id) {
    return false;
  }
  if (query.agent_id !== undefined && entry.agent_id !== query.agent_id) {
    return false;
  }
  if (query.kind !== undefined && entry.kind !== query.kind) {
    return false;
  }
  if (query.capability !== undefined && entry.capability !== query.capability) {
    return false;
  }
  if (query.since !== undefined && entry.created_at < query.since) {
    return false;
  }
  if (query.until !== undefined && entry.created_at > query.until) {
    return false;
  }
  return true;
}

/** In-memory `MemoryStore` for tests and ephemeral runtimes. */
export class InMemoryMemoryStore implements MemoryStore {
  private readonly entries = new Map<string, MemoryEntry>();
  private closed = false;

  append(input: MemoryEntryInput): Promise<MemoryEntry> {
    this.assertOpen();
    const entry: MemoryEntry = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      ...input,
    };
    this.entries.set(entry.id, entry);
    return Promise.resolve(entry);
  }

  get(id: string): Promise<MemoryEntry | undefined> {
    this.assertOpen();
    return Promise.resolve(this.entries.get(id));
  }

  query(filters: MemoryQuery): Promise<readonly MemoryEntry[]> {
    this.assertOpen();
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    const matched = [...this.entries.values()]
      .filter((entry) => matchesQuery(entry, filters))
      .sort(compareCreatedAt);

    return Promise.resolve(matched.slice(offset, offset + limit));
  }

  listScopes(): Promise<readonly string[]> {
    this.assertOpen();
    const scopes = new Set<string>();
    for (const entry of this.entries.values()) {
      scopes.add(entry.scope);
    }
    return Promise.resolve([...scopes].sort());
  }

  close(): Promise<void> {
    this.closed = true;
    this.entries.clear();
    return Promise.resolve();
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new OacpMemoryError(MEMORY_ERROR_CODES.STORE_CLOSED, 'Memory store is closed');
    }
  }
}

/** Create a new in-memory memory store. */
export function createInMemoryMemoryStore(): InMemoryMemoryStore {
  return new InMemoryMemoryStore();
}
