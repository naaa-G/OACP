/** Shared SQL schema for SQLite and PostgreSQL memory backends. */
export const MEMORY_ENTRIES_TABLE = 'memory_entries';

export const MEMORY_ENTRIES_DDL = `
CREATE TABLE IF NOT EXISTS ${MEMORY_ENTRIES_TABLE} (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  message_id TEXT,
  agent_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  capability TEXT,
  status TEXT,
  payload TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);
`;

export const MEMORY_ENTRIES_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_memory_scope ON ${MEMORY_ENTRIES_TABLE}(scope);`,
  `CREATE INDEX IF NOT EXISTS idx_memory_trace ON ${MEMORY_ENTRIES_TABLE}(trace_id);`,
  `CREATE INDEX IF NOT EXISTS idx_memory_agent ON ${MEMORY_ENTRIES_TABLE}(agent_id);`,
  `CREATE INDEX IF NOT EXISTS idx_memory_kind ON ${MEMORY_ENTRIES_TABLE}(kind);`,
  `CREATE INDEX IF NOT EXISTS idx_memory_created ON ${MEMORY_ENTRIES_TABLE}(created_at);`,
] as const;

export interface MemoryEntryRow {
  readonly id: string;
  readonly scope: string;
  readonly trace_id: string;
  readonly message_id: string | null;
  readonly agent_id: string;
  readonly kind: string;
  readonly capability: string | null;
  readonly status: string | null;
  readonly payload: string;
  readonly metadata: string | null;
  readonly created_at: string;
}
