#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Resolve MCPLab root — prefer integrate/mcplab, fall back to MCPLab/. */
export function resolveMcplabRoot(cwd = process.cwd()) {
  const candidates = [resolve(cwd, 'integrate', 'mcplab'), resolve(cwd, 'MCPLab')];

  for (const root of candidates) {
    if (existsSync(resolve(root, 'docker-compose.yml'))) {
      return root;
    }
  }

  return null;
}

const mcplabRoot = resolveMcplabRoot();

if (!mcplabRoot) {
  console.error('');
  console.error('MCPLab directory not found.');
  console.error('');
  console.error('Clone MCPLab:');
  console.error('  git clone https://github.com/naaa-G/MCPLab.git MCPLab');
  console.error('');
  console.error('Or use integrate templates at ./integrate/mcplab/docker-compose.yml');
  console.error('');
  console.error('Then retry:');
  console.error('  pnpm docker:mcplab');
  console.error('');
  console.error('Or run the platform without MCPLab:');
  console.error('  docker compose up --build -d');
  console.error('  docker compose --profile demo up --build');
  console.error('');
  process.exit(1);
}
