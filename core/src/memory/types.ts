import type { TaskStatus } from '../protocol/message-types.js';

/** Category of persisted memory entry. */
export type MemoryEntryKind =
  | 'task_request'
  | 'task_response'
  | 'delegation'
  | 'decision'
  | 'output';

/** A single persisted task-history or decision record. */
export interface MemoryEntry {
  readonly id: string;
  readonly scope: string;
  readonly trace_id: string;
  readonly message_id?: string;
  readonly agent_id: string;
  readonly kind: MemoryEntryKind;
  readonly capability?: string;
  readonly status?: TaskStatus;
  readonly payload: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
  readonly created_at: string;
}

/** Input for creating a memory entry (`id` and `created_at` assigned by the store). */
export interface MemoryEntryInput {
  readonly scope: string;
  readonly trace_id: string;
  readonly message_id?: string;
  readonly agent_id: string;
  readonly kind: MemoryEntryKind;
  readonly capability?: string;
  readonly status?: TaskStatus;
  readonly payload: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

/** Query filters for listing memory entries. */
export interface MemoryQuery {
  readonly scope?: string;
  readonly trace_id?: string;
  readonly agent_id?: string;
  readonly kind?: MemoryEntryKind;
  readonly capability?: string;
  readonly since?: string;
  readonly until?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/** Pluggable persistent memory backend (SQLite, Postgres, in-memory). */
export interface MemoryStore {
  append(input: MemoryEntryInput): Promise<MemoryEntry>;
  get(id: string): Promise<MemoryEntry | undefined>;
  query(filters: MemoryQuery): Promise<readonly MemoryEntry[]>;
  listScopes(): Promise<readonly string[]>;
  close(): Promise<void>;
}

export type MemoryBackend = 'memory' | 'sqlite' | 'postgres';

export interface MemoryStoreConfig {
  readonly backend: MemoryBackend;
  /** SQLite database file path (default: `:memory:`). */
  readonly sqlitePath?: string;
  /** PostgreSQL connection URL (`postgres://...`). */
  readonly postgresUrl?: string;
  readonly defaultScope?: string;
}
