import Database from 'better-sqlite3';

import {
  inferTraceListStatusFromMessages,
  parseAgentIdentity,
  type AgentIdentity,
  type OacpMessage,
  type TraceListEntry,
} from '@oacp/core';

import type { ObservabilityPersistence } from '../observability/observability-persistence.js';
import { prepareSqliteDatabasePath } from './resolve-sqlite-path.js';
import {
  OBS_AGENTS_TABLE,
  OBS_TRACE_MESSAGES_TABLE,
  OBSERVABILITY_PERSISTENCE_DDL,
  OBSERVABILITY_PERSISTENCE_INDEXES,
  type ObsTraceMessageRow,
} from './observability-sql-schema.js';

export interface SqliteObservabilityPersistenceOptions {
  readonly path?: string;
}

function collectAgentsFromMessage(message: OacpMessage): readonly string[] {
  const agents = new Set<string>([message.from]);
  if (message.type === 'task_request' || message.type === 'delegation') {
    if (message.to !== undefined) {
      agents.add(message.to);
    }
  }
  return [...agents];
}

function buildTraceListEntry(traceId: string, messages: readonly OacpMessage[]): TraceListEntry {
  const first = messages[0];
  const last = messages[messages.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error(`Trace ${traceId} has no messages`);
  }
  const messageTypes = new Set<string>();
  const agents = new Set<string>();

  for (const message of messages) {
    messageTypes.add(message.type);
    for (const agentId of collectAgentsFromMessage(message)) {
      agents.add(agentId);
    }
  }

  const lifecycle = inferTraceListStatusFromMessages(messages);

  return {
    traceId,
    startedAt: first.timestamp,
    lastActivityAt: last.timestamp,
    messageCount: messages.length,
    messageTypes: [...messageTypes].sort(),
    agents: [...agents].sort(),
    status: lifecycle.status,
    ...(lifecycle.completedAt !== undefined ? { completedAt: lifecycle.completedAt } : {}),
  };
}

/** No-op persistence for in-memory dev mode. */
export class DisabledObservabilityPersistence implements ObservabilityPersistence {
  readonly enabled = false;

  upsertAgent(): void {}

  touchAgentLastSeen(): void {}

  getAgentLastSeen(): string | undefined {
    return undefined;
  }

  listAgents(): readonly AgentIdentity[] {
    return [];
  }

  appendMessage(): boolean {
    return false;
  }

  hasMessage(): boolean {
    return false;
  }

  hasTrace(): boolean {
    return false;
  }

  listTraceIds(): readonly string[] {
    return [];
  }

  listTraces(): readonly TraceListEntry[] {
    return [];
  }

  getTraceMessages(): readonly OacpMessage[] {
    return [];
  }

  async close(): Promise<void> {}
}

/** SQLite-backed trace + registry persistence (Day 53). */
export class SqliteObservabilityPersistence implements ObservabilityPersistence {
  readonly enabled = true;

  private readonly db: Database.Database;
  private closed = false;

  constructor(options: SqliteObservabilityPersistenceOptions = {}) {
    const databasePath = prepareSqliteDatabasePath(options.path ?? ':memory:');
    this.db = new Database(databasePath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(OBSERVABILITY_PERSISTENCE_DDL);
    for (const indexSql of OBSERVABILITY_PERSISTENCE_INDEXES) {
      this.db.exec(indexSql);
    }
  }

  upsertAgent(identity: AgentIdentity, options: { lastSeenAt?: string } = {}): void {
    this.assertOpen();
    const now = new Date().toISOString();
    const statement = this.db.prepare(`
      INSERT INTO ${OBS_AGENTS_TABLE} (agent_id, identity_json, last_seen_at, registered_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(agent_id) DO UPDATE SET
        identity_json = excluded.identity_json,
        last_seen_at = COALESCE(excluded.last_seen_at, ${OBS_AGENTS_TABLE}.last_seen_at)
    `);

    statement.run(identity.id, JSON.stringify(identity), options.lastSeenAt ?? null, now);
  }

  touchAgentLastSeen(agentId: string, timestamp: string): void {
    this.assertOpen();
    this.db
      .prepare(
        `UPDATE ${OBS_AGENTS_TABLE}
         SET last_seen_at = ?
         WHERE agent_id = ? AND (last_seen_at IS NULL OR last_seen_at < ?)`,
      )
      .run(timestamp, agentId, timestamp);
  }

  getAgentLastSeen(agentId: string): string | undefined {
    this.assertOpen();
    const row = this.db
      .prepare(`SELECT last_seen_at FROM ${OBS_AGENTS_TABLE} WHERE agent_id = ?`)
      .get(agentId) as { last_seen_at: string | null } | undefined;
    return row?.last_seen_at ?? undefined;
  }

  listAgents(): readonly AgentIdentity[] {
    this.assertOpen();
    const rows = this.db
      .prepare(`SELECT identity_json FROM ${OBS_AGENTS_TABLE} ORDER BY agent_id ASC`)
      .all() as Array<{ identity_json: string }>;

    return rows.map((row) => parseAgentIdentity(JSON.parse(row.identity_json) as unknown));
  }

  appendMessage(message: OacpMessage): boolean {
    this.assertOpen();
    if (this.hasMessage(message.message_id)) {
      return false;
    }

    const sequenceRow = this.db
      .prepare(
        `SELECT COALESCE(MAX(sequence), 0) AS max_sequence FROM ${OBS_TRACE_MESSAGES_TABLE} WHERE trace_id = ?`,
      )
      .get(message.trace_id) as { max_sequence: number };

    const sequence = sequenceRow.max_sequence + 1;

    this.db
      .prepare(
        `INSERT INTO ${OBS_TRACE_MESSAGES_TABLE}
         (trace_id, message_id, timestamp, sequence, message_json)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        message.trace_id,
        message.message_id,
        message.timestamp,
        sequence,
        JSON.stringify(message),
      );

    for (const agentId of collectAgentsFromMessage(message)) {
      this.touchAgentLastSeen(agentId, message.timestamp);
    }

    return true;
  }

  hasMessage(messageId: string): boolean {
    this.assertOpen();
    const row = this.db
      .prepare(`SELECT 1 FROM ${OBS_TRACE_MESSAGES_TABLE} WHERE message_id = ? LIMIT 1`)
      .get(messageId) as { 1: number } | undefined;
    return row !== undefined;
  }

  hasTrace(traceId: string): boolean {
    this.assertOpen();
    const row = this.db
      .prepare(`SELECT 1 FROM ${OBS_TRACE_MESSAGES_TABLE} WHERE trace_id = ? LIMIT 1`)
      .get(traceId) as { 1: number } | undefined;
    return row !== undefined;
  }

  listTraceIds(): readonly string[] {
    this.assertOpen();
    const rows = this.db
      .prepare(`SELECT DISTINCT trace_id FROM ${OBS_TRACE_MESSAGES_TABLE} ORDER BY trace_id ASC`)
      .all() as Array<{ trace_id: string }>;
    return rows.map((row) => row.trace_id);
  }

  listTraces(options: { limit?: number; offset?: number } = {}): readonly TraceListEntry[] {
    this.assertOpen();
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const traceRows = this.db
      .prepare(
        `SELECT trace_id, MAX(timestamp) AS last_activity
         FROM ${OBS_TRACE_MESSAGES_TABLE}
         GROUP BY trace_id
         ORDER BY last_activity DESC
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as Array<{ trace_id: string }>;

    const entries: TraceListEntry[] = [];
    for (const row of traceRows) {
      const messages = this.getTraceMessages(row.trace_id);
      if (messages.length > 0) {
        entries.push(buildTraceListEntry(row.trace_id, messages));
      }
    }

    return entries;
  }

  getTraceMessages(traceId: string): readonly OacpMessage[] {
    this.assertOpen();
    const rows = this.db
      .prepare(
        `SELECT message_json FROM ${OBS_TRACE_MESSAGES_TABLE}
         WHERE trace_id = ?
         ORDER BY sequence ASC`,
      )
      .all(traceId) as ObsTraceMessageRow[];

    return rows.map((row) => JSON.parse(row.message_json) as OacpMessage);
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.db.close();
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('SQLite observability persistence is closed');
    }
  }
}

export function createObservabilityPersistence(options: {
  readonly backend: 'memory' | 'sqlite' | 'postgres';
  readonly sqlitePath?: string;
}): ObservabilityPersistence {
  if (options.backend !== 'sqlite') {
    return new DisabledObservabilityPersistence();
  }

  return new SqliteObservabilityPersistence({
    ...(options.sqlitePath !== undefined ? { path: options.sqlitePath } : {}),
  });
}
