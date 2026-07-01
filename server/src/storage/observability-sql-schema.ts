/** SQLite tables for OACP observability persistence (Day 53). */

export const OBS_AGENTS_TABLE = 'obs_agents' as const;
export const OBS_TRACE_MESSAGES_TABLE = 'obs_trace_messages' as const;

export const OBSERVABILITY_PERSISTENCE_DDL = `
CREATE TABLE IF NOT EXISTS ${OBS_AGENTS_TABLE} (
  agent_id TEXT PRIMARY KEY,
  identity_json TEXT NOT NULL,
  last_seen_at TEXT,
  registered_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ${OBS_TRACE_MESSAGES_TABLE} (
  trace_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  message_json TEXT NOT NULL,
  PRIMARY KEY (trace_id, message_id)
);
`;

export const OBSERVABILITY_PERSISTENCE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_obs_trace_messages_trace ON ${OBS_TRACE_MESSAGES_TABLE}(trace_id, sequence);`,
  `CREATE INDEX IF NOT EXISTS idx_obs_trace_messages_timestamp ON ${OBS_TRACE_MESSAGES_TABLE}(timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_obs_agents_last_seen ON ${OBS_AGENTS_TABLE}(last_seen_at);`,
] as const;

export interface ObsAgentRow {
  readonly agent_id: string;
  readonly identity_json: string;
  readonly last_seen_at: string | null;
  readonly registered_at: string;
}

export interface ObsTraceMessageRow {
  readonly trace_id: string;
  readonly message_id: string;
  readonly timestamp: string;
  readonly sequence: number;
  readonly message_json: string;
}
