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
