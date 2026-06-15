import Database from 'better-sqlite3';

import type { MemoryEntry, MemoryEntryInput, MemoryQuery, MemoryStore } from '@oacp/core';
import { MEMORY_ERROR_CODES, OacpMemoryError } from '@oacp/core';

import { MEMORY_ENTRIES_DDL, MEMORY_ENTRIES_INDEXES, MEMORY_ENTRIES_TABLE } from './sql-schema.js';
import {
  buildWhereClause,
  inputToInsertRow,
  rowToMemoryEntry,
  toSqlitePlaceholders,
} from './sql-utils.js';
import type { MemoryEntryRow } from './sql-schema.js';
import { prepareSqliteDatabasePath } from './resolve-sqlite-path.js';

export interface SqliteMemoryStoreOptions {
  readonly path?: string;
}

/**
 * SQLite-backed `MemoryStore` for local development and single-node deployments.
 */
export class SqliteMemoryStore implements MemoryStore {
  private readonly db: Database.Database;
  private readonly databasePath: string;
  private closed = false;

  constructor(options: SqliteMemoryStoreOptions = {}) {
    this.databasePath = prepareSqliteDatabasePath(options.path ?? ':memory:');
    this.db = new Database(this.databasePath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(MEMORY_ENTRIES_DDL);
    for (const indexSql of MEMORY_ENTRIES_INDEXES) {
      this.db.exec(indexSql);
    }
  }

  append(input: MemoryEntryInput): Promise<MemoryEntry> {
    this.assertOpen();
    const row = inputToInsertRow(input);
    const statement = this.db.prepare(`
      INSERT INTO ${MEMORY_ENTRIES_TABLE} (
        id, scope, trace_id, message_id, agent_id, kind, capability, status, payload, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      row.id,
      row.scope,
      row.trace_id,
      row.message_id,
      row.agent_id,
      row.kind,
      row.capability,
      row.status,
      row.payload,
      row.metadata,
      row.created_at,
    );

    return Promise.resolve(rowToMemoryEntry(row));
  }

  get(id: string): Promise<MemoryEntry | undefined> {
    this.assertOpen();
    const row = this.db.prepare(`SELECT * FROM ${MEMORY_ENTRIES_TABLE} WHERE id = ?`).get(id) as
      | MemoryEntryRow
      | undefined;
    return Promise.resolve(row ? rowToMemoryEntry(row) : undefined);
  }

  query(filters: MemoryQuery): Promise<readonly MemoryEntry[]> {
    this.assertOpen();
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    const { sql: whereSql, params } = buildWhereClause(filters);

    const sqliteWhere = toSqlitePlaceholders(whereSql);
    const sql = `
      SELECT * FROM ${MEMORY_ENTRIES_TABLE}
      ${sqliteWhere}
      ORDER BY created_at ASC
      LIMIT ?
      OFFSET ?
    `;

    const rows = this.db.prepare(sql).all(...params, limit, offset) as MemoryEntryRow[];

    return Promise.resolve(rows.map(rowToMemoryEntry));
  }

  listScopes(): Promise<readonly string[]> {
    this.assertOpen();
    const rows = this.db
      .prepare(`SELECT DISTINCT scope FROM ${MEMORY_ENTRIES_TABLE} ORDER BY scope ASC`)
      .all() as Array<{ scope: string }>;
    return Promise.resolve(rows.map((row) => row.scope));
  }

  close(): Promise<void> {
    if (this.closed) {
      return Promise.resolve();
    }
    this.closed = true;
    this.db.close();
    return Promise.resolve();
  }

  /** Resolved on-disk path, or `:memory:` for ephemeral databases. */
  get path(): string {
    return this.databasePath;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new OacpMemoryError(MEMORY_ERROR_CODES.STORE_CLOSED, 'SQLite memory store is closed');
    }
  }
}

export function createSqliteMemoryStore(options?: SqliteMemoryStoreOptions): SqliteMemoryStore {
  return new SqliteMemoryStore(options);
}
