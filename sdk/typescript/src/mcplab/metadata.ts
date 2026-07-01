import { PROTOCOL_VERSION, type AgentIdentity } from '@oacp/core';
import { MCPLAB_FLEET, MCPLAB_ROLES, buildMcplabAgentMetadata } from '@oacp/core';

import { DEFAULT_DEV_PUBLIC_KEY } from '../defaults.js';
import type { AgentClient } from '../client/agent-client.js';
import type { RegisterAgentOptions } from '../client/types.js';

export { MCPLAB_FLEET, MCPLAB_ROLES, buildMcplabAgentMetadata };

export interface BuildMcplabAgentIdentityParams {
  readonly id: string;
  readonly name: string;
  readonly capabilities: readonly string[];
  readonly role: string;
  readonly description?: string;
}

/** Build a dev-ready MCPLab agent identity with fleet + role metadata. */
export function buildMcplabAgentIdentity(params: BuildMcplabAgentIdentityParams): AgentIdentity {
  return {
    id: params.id,
    name: params.name,
    version: PROTOCOL_VERSION,
    capabilities: [...params.capabilities],
    publicKey: DEFAULT_DEV_PUBLIC_KEY,
    metadata: buildMcplabAgentMetadata(params.role),
    ...(params.description !== undefined ? { description: params.description } : {}),
  };
}

export type RegisterMcplabAgentParams = BuildMcplabAgentIdentityParams;

/** Register an MCPLab agent on a remote OACP server (replace=true by default). */
export async function registerMcplabAgent(
  client: AgentClient,
  params: RegisterMcplabAgentParams,
  options: RegisterAgentOptions = {},
): Promise<AgentIdentity> {
  return client.registerAgent(buildMcplabAgentIdentity(params), { replace: true, ...options });
}
