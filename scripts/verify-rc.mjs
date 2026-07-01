#!/usr/bin/env node
/**
 * Day 59 — RC verify alias (delegates to full `pnpm verify`).
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['verify'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('');
console.log('RC verify complete (full pnpm verify).');
