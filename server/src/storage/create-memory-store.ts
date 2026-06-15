import {
  createInMemoryMemoryStore,
  type MemoryStore,
  type MemoryStoreConfig,
  OacpMemoryError,
  MEMORY_ERROR_CODES,
} from '@oacp/core';

import { createSqliteMemoryStore } from './sqlite-memory-store.js';
import { createPostgresMemoryStore } from './postgres-memory-store.js';

/** Create a memory store from configuration (memory, SQLite, or PostgreSQL). */
export async function createMemoryStore(config: MemoryStoreConfig): Promise<MemoryStore> {
  switch (config.backend) {
    case 'memory':
      return createInMemoryMemoryStore();
    case 'sqlite':
      return createSqliteMemoryStore({ path: config.sqlitePath ?? ':memory:' });
    case 'postgres': {
      const url = config.postgresUrl;
      if (url === undefined || url.length === 0) {
        throw new OacpMemoryError(
          MEMORY_ERROR_CODES.BACKEND_ERROR,
          'postgresUrl is required when backend is "postgres"',
        );
      }
      return createPostgresMemoryStore(url);
    }
    default: {
      const exhaustive: never = config.backend;
      throw new OacpMemoryError(
        MEMORY_ERROR_CODES.BACKEND_ERROR,
        `Unsupported memory backend: ${String(exhaustive)}`,
      );
    }
  }
}
