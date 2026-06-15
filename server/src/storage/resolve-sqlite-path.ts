import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

const IN_MEMORY_ALIASES = new Set(['', ':memory:']);

/**
 * Resolve a SQLite database path and ensure the parent directory exists.
 * Relative paths are resolved against `process.cwd()`.
 */
export function prepareSqliteDatabasePath(rawPath: string | undefined): string {
  const trimmed = rawPath?.trim() ?? '';
  if (IN_MEMORY_ALIASES.has(trimmed) || trimmed.startsWith('file:')) {
    return trimmed.length === 0 ? ':memory:' : trimmed;
  }

  const resolved = isAbsolute(trimmed) ? trimmed : resolve(process.cwd(), trimmed);
  const parentDir = dirname(resolved);

  if (parentDir !== resolved) {
    mkdirSync(parentDir, { recursive: true });
  }

  return resolved;
}
