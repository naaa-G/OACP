import { randomUUID } from 'node:crypto';

import type {
  MemoryEntry,
  MemoryEntryInput,
  MemoryEntryKind,
  MemoryQuery,
  TaskStatus,
} from '@oacp/core';
import { MEMORY_ERROR_CODES, OacpMemoryError } from '@oacp/core';

import type { MemoryEntryRow } from './sql-schema.js';

export function parsePayload(json: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new OacpMemoryError(
      MEMORY_ERROR_CODES.BACKEND_ERROR,
      'Stored payload is not a JSON object',
    );
  }
  return parsed as Record<string, unknown>;
}

export function parseMetadata(json: string | null): Record<string, unknown> | undefined {
  if (json === null || json.length === 0) {
    return undefined;
  }
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }
  return parsed as Record<string, unknown>;
}

export function rowToMemoryEntry(row: MemoryEntryRow): MemoryEntry {
  const entry: MemoryEntry = {
    id: row.id,
    scope: row.scope,
    trace_id: row.trace_id,
    agent_id: row.agent_id,
    kind: row.kind as MemoryEntryKind,
    payload: parsePayload(row.payload),
    created_at: row.created_at,
    ...(row.message_id !== null ? { message_id: row.message_id } : {}),
    ...(row.capability !== null ? { capability: row.capability } : {}),
    ...(row.status !== null ? { status: row.status as TaskStatus } : {}),
  };

  const metadata = parseMetadata(row.metadata);
  if (metadata !== undefined) {
    return { ...entry, metadata };
  }
  return entry;
}

export function inputToInsertRow(input: MemoryEntryInput): MemoryEntryRow {
  return {
    id: randomUUID(),
    scope: input.scope,
    trace_id: input.trace_id,
    message_id: input.message_id ?? null,
    agent_id: input.agent_id,
    kind: input.kind,
    capability: input.capability ?? null,
    status: input.status ?? null,
    payload: JSON.stringify(input.payload),
    metadata: input.metadata !== undefined ? JSON.stringify(input.metadata) : null,
    created_at: new Date().toISOString(),
  };
}

export function buildWhereClause(filters: MemoryQuery): {
  readonly sql: string;
  readonly params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.scope !== undefined) {
    params.push(filters.scope);
    clauses.push(`scope = $${String(params.length)}`);
  }
  if (filters.trace_id !== undefined) {
    params.push(filters.trace_id);
    clauses.push(`trace_id = $${String(params.length)}`);
  }
  if (filters.agent_id !== undefined) {
    params.push(filters.agent_id);
    clauses.push(`agent_id = $${String(params.length)}`);
  }
  if (filters.kind !== undefined) {
    params.push(filters.kind);
    clauses.push(`kind = $${String(params.length)}`);
  }
  if (filters.capability !== undefined) {
    params.push(filters.capability);
    clauses.push(`capability = $${String(params.length)}`);
  }
  if (filters.since !== undefined) {
    params.push(filters.since);
    clauses.push(`created_at >= $${String(params.length)}`);
  }
  if (filters.until !== undefined) {
    params.push(filters.until);
    clauses.push(`created_at <= $${String(params.length)}`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return { sql: where, params };
}

/** Convert `$1` placeholders to `?` for SQLite prepared statements. */
export function toSqlitePlaceholders(sql: string): string {
  return sql.replace(/\$\d+/g, '?');
}
