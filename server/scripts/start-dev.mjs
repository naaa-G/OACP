/**
 * Start the reference server with in-memory storage (no better-sqlite3 native module).
 * Use when Node ABI mismatches block SQLite, or for lightweight local Console testing.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cliPath = join(scriptDir, '..', 'dist', 'cli.js');

const child = spawn(process.execPath, [cliPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    OACP_MEMORY_BACKEND: 'memory',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
