import type { Pool, PoolClient } from 'pg';

import type { MemoryEntry, MemoryEntryInput, MemoryQuery, MemoryStore } from '@oacp/core';
import { MEMORY_ERROR_CODES, OacpMemoryError } from '@oacp/core';

import { MEMORY_ENTRIES_DDL, MEMORY_ENTRIES_INDEXES, MEMORY_ENTRIES_TABLE } from './sql-schema.js';
import { buildWhereClause, inputToInsertRow, rowToMemoryEntry } from './sql-utils.js';
import type { MemoryEntryRow } from './sql-schema.js';

export interface PostgresMemoryStoreOptions {
  readonly pool: Pool;
  readonly initialize?: boolean;
}

/**
 * PostgreSQL-backed `MemoryStore` for production multi-node deployments.
 */
export class PostgresMemoryStore implements MemoryStore {
  private readonly pool: Pool;
  private closed = false;
  private initialized = false;

  constructor(options: PostgresMemoryStoreOptions) {
    this.pool = options.pool;
    if (options.initialize ?? true) {
      // Schema init is async; callers should await ensureSchema() before use in production.
    }
  }

  async ensureSchema(): Promise<void> {
    if (this.initialized) {
      return;
    }
    const client = await this.pool.connect();
    try {
      await client.query(MEMORY_ENTRIES_DDL);
      for (const indexSql of MEMORY_ENTRIES_INDEXES) {
        await client.query(indexSql);
      }
      this.initialized = true;
    } finally {
      client.release();
    }
  }

  async append(input: MemoryEntryInput): Promise<MemoryEntry> {
    await this.ensureSchema();
    this.assertOpen();
    const row = inputToInsertRow(input);

    await this.pool.query(
      `INSERT INTO ${MEMORY_ENTRIES_TABLE} (
        id, scope, trace_id, message_id, agent_id, kind, capability, status, payload, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
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
      ],
    );

    return rowToMemoryEntry(row);
  }

  async get(id: string): Promise<MemoryEntry | undefined> {
    await this.ensureSchema();
    this.assertOpen();
    const result = await this.pool.query<MemoryEntryRow>(
      `SELECT * FROM ${MEMORY_ENTRIES_TABLE} WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? rowToMemoryEntry(row) : undefined;
  }

  async query(filters: MemoryQuery): Promise<readonly MemoryEntry[]> {
    await this.ensureSchema();
    this.assertOpen();
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    const { sql: whereSql, params } = buildWhereClause(filters);

    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    const sql = `
      SELECT * FROM ${MEMORY_ENTRIES_TABLE}
      ${whereSql}
      ORDER BY created_at ASC
      LIMIT $${String(limitIndex)} OFFSET $${String(offsetIndex)}
    `;

    const result = await this.pool.query<MemoryEntryRow>(sql, [...params, limit, offset]);
    return result.rows.map(rowToMemoryEntry);
  }

  async listScopes(): Promise<readonly string[]> {
    await this.ensureSchema();
    this.assertOpen();
    const result = await this.pool.query<{ scope: string }>(
      `SELECT DISTINCT scope FROM ${MEMORY_ENTRIES_TABLE} ORDER BY scope ASC`,
    );
    return result.rows.map((row) => row.scope);
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    await this.pool.end();
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new OacpMemoryError(
        MEMORY_ERROR_CODES.STORE_CLOSED,
        'PostgreSQL memory store is closed',
      );
    }
  }
}

export async function createPostgresMemoryStore(
  connectionUrl: string,
): Promise<PostgresMemoryStore> {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: connectionUrl });
  const store = new PostgresMemoryStore({ pool });
  await store.ensureSchema();
  return store;
}

export type { Pool, PoolClient };
