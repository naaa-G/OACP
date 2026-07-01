import { PROTOCOL_VERSION, type AgentIdentity } from '@oacp/core';

import { DEFAULT_DEV_PUBLIC_KEY } from '../defaults.js';
import type { AgentClient } from './agent-client.js';
import type { RegisterAgentOptions } from './types.js';

export interface RegisterDevAgentParams {
  readonly id: string;
  readonly name: string;
  readonly capabilities: readonly string[];
  readonly description?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Register an agent on a remote node using the development public key.
 * For local demos and tests only — replace with real keys in production.
 *
 * Defaults to `replace: true` so scripts can be re-run against a live server.
 */
export async function registerDevAgent(
  client: AgentClient,
  params: RegisterDevAgentParams,
  options: RegisterAgentOptions = {},
): Promise<AgentIdentity> {
  return client.registerAgent(
    {
      id: params.id,
      name: params.name,
      version: PROTOCOL_VERSION,
      capabilities: [...params.capabilities],
      publicKey: DEFAULT_DEV_PUBLIC_KEY,
      ...(params.description !== undefined ? { description: params.description } : {}),
      ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    },
    { replace: true, ...options },
  );
}
