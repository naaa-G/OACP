#!/usr/bin/env node
/**
 * Day 59 — release candidate gate (OACP v1.0.0-rc.1).
 *
 * Runs verify + adoption smoke + RC sync test. Optional --live for MCPLab eval.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function run(command, args, options = {}) {
  console.log('');
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Day 59 — OACP v1.0.0-rc.1 gate');

console.log('');
console.log('Step 1/6 — Full verify (format, build, lint, typecheck, test, API freeze)');
run('pnpm', ['verify']);

console.log('');
console.log('Step 2/6 — Day 55 load + security smoke');
run('pnpm', ['test:day55']);

console.log('');
console.log('Step 3/6 — Day 56 demo rehearsal');
run('pnpm', ['--filter', '@oacp/server', 'test', '--', 'demo-rehearsal']);

console.log('');
console.log('Step 4/6 — Day 59 RC sync (recreate OACP → backfill)');
run('pnpm', ['--filter', '@oacp/server', 'test', '--', 'day59-rc-sync']);

console.log('');
console.log('Step 5/6 — Adoption kit smoke (MCP + custom-agents HTTP path)');
run('pnpm', ['--filter', '@oacp/server', 'test', '--', 'mcp-oacp-smoke']);

console.log('');
console.log('Step 6/6 — Docs site build');
run('pnpm', ['docs:build']);

if (process.argv.includes('--live')) {
  const mcplabRoot = resolve(process.cwd(), 'MCPLab');
  if (existsSync(mcplabRoot)) {
    console.log('');
    console.log('Optional — MCPLab RC eval (quick suite)');
    run('node', ['scripts/mcplab-rc-eval.mjs', '--suite', 'quick']);
  } else {
    console.log('');
    console.log('Skip MCPLab eval — MCPLab/ not found (clone for --live eval)');
  }
}

console.log('');
console.log('Day 59 RC gate passed.');
console.log('Next: tag v1.0.0-rc.1 — see docs/releases/v1.0.0-rc.1.md');
