import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getSchemasRoot, parseAgentIdentity } from '@oacp/core';
import type { AgentIdentity } from '@oacp/core';

import { createApp } from '../src/app.js';
import type { CreateAppOptions, OacpApp } from '../src/app.js';

export function loadSummarizerIdentity(): AgentIdentity {
  const raw = JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'agent-identity.example.json'), 'utf8'),
  ) as unknown;
  return parseAgentIdentity(raw);
}

export function createTestApp(options: CreateAppOptions = {}): OacpApp {
  return createApp({
    ...options,
    logger: false,
    config: { memoryBackend: 'memory', ...options.config },
  });
}

/** Dev public key for test agent identities (matches SDK example key). */
export function devPublicKey(): AgentIdentity['publicKey'] {
  return loadSummarizerIdentity().publicKey;
}
