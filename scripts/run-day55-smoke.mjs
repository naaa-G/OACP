#!/usr/bin/env node
/**
 * Day 55 smoke runner — Vitest gates + optional live security audits.
 */

import { spawnSync } from 'node:child_process';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Day 55 — Vitest smoke (snapshot p95, sync backfill, SSE limits, security)');
run('pnpm', ['--filter', '@oacp/server', 'test', '--', 'day55']);

if (process.argv.includes('--live')) {
  console.log('');
  console.log('Day 55 — live OACP security audit');
  run('node', ['scripts/security-audit.mjs']);

  if (process.env.SKIP_MCPLAB_AUDIT !== '1') {
    console.log('');
    console.log('Day 55 — live MCPLab security audit');
    run('node', ['scripts/mcplab-security-audit.mjs']);
  }
}

console.log('');
console.log('Day 55 smoke complete. Optional k6: see benchmarks/k6/README.md');
