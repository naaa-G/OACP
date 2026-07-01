import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** Prefer Linux /tmp for SQLite under act/Docker (avoid Windows bind-mount quirks). */
export function isolatedSqlitePath(label: string): string {
  const stamp = `${label}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const actTmp = process.env.OACP_TEST_SQLITE_DIR?.trim();
  if (actTmp !== undefined && actTmp.length > 0) {
    mkdirSync(actTmp, { recursive: true });
    return join(actTmp, `${stamp}.db`);
  }

  const base = join(process.cwd(), '.oacp');
  mkdirSync(base, { recursive: true });
  return join(base, `${stamp}.db`);
}
