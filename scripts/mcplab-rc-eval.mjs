#!/usr/bin/env node
/**
 * Day 59 — run MCPLab gold eval against OACP v1 server (RC gate).
 * Requires MCPLab/ clone and running OACP at OACP_BASE_URL (default :3847).
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const mcplabRoot = resolve(process.cwd(), 'MCPLab');
const oacpUrl = (
  process.env.OACP_BASE_URL ??
  process.env.OACP_SERVER_URL ??
  'http://127.0.0.1:3847'
).replace(/\/+$/, '');

if (!existsSync(mcplabRoot)) {
  console.error('MCPLab/ not found. Clone beside OACP repo or set SKIP_MCPLAB_EVAL=1.');
  process.exit(process.env.SKIP_MCPLAB_EVAL === '1' ? 0 : 1);
}

const suiteArgIndex = process.argv.indexOf('--suite');
const suite = suiteArgIndex >= 0 ? (process.argv[suiteArgIndex + 1] ?? 'quick') : 'quick';

console.log(`MCPLab RC eval — suite=${suite} OACP=${oacpUrl}`);

const health = spawnSync('curl', ['-sf', `${oacpUrl}/health`], {
  shell: process.platform === 'win32',
  encoding: 'utf8',
});
if (health.status !== 0) {
  console.error(`OACP not reachable at ${oacpUrl}/health — start docker compose up -d`);
  process.exit(1);
}

const isWin = process.platform === 'win32';
const venvPython = resolve(mcplabRoot, '.venv', isWin ? 'Scripts/python.exe' : 'bin/python');
const python = existsSync(venvPython) ? venvPython : 'python';

const args = ['scripts/run_eval.py', '--suite', suite, '--json'];
const env = {
  ...process.env,
  MCPLAB_OACP_SERVER_URL: oacpUrl,
  MCPLAB_OACP_CONSOLE_URL: `${oacpUrl}/console`,
};

const result = spawnSync(python, args, {
  cwd: mcplabRoot,
  stdio: 'inherit',
  env,
  shell: isWin,
});

process.exit(result.status ?? 1);
