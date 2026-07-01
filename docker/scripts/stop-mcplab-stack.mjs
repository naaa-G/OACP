#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const mcplabCompose = resolve(repoRoot, 'MCPLab', 'docker-compose.yml');

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

if (existsSync(mcplabCompose)) {
  run('docker', ['compose', '-f', mcplabCompose, 'down'], { cwd: repoRoot });
}

run('docker', ['compose', 'down'], { cwd: repoRoot });
