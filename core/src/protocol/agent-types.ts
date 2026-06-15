/** JSON Web Key public key material (RFC 7517 subset). */
export interface JsonWebKeyPublic {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
  kid?: string;
  use?: 'sig' | 'enc';
  alg?: string;
  [key: string]: unknown;
}

/** Public key as PEM string or JWK object. */
export type PublicKeyMaterial = string | JsonWebKeyPublic;

/** Canonical OACP agent identity record (`specs/agent/identity.schema.json`). */
export interface AgentIdentity {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  publicKey: PublicKeyMaterial;
  description?: string;
  metadata?: Record<string, unknown>;
}

/** Rich metadata for a single capability (`$defs/capabilityDeclaration`). */
export interface CapabilityDeclaration {
  id: string;
  name: string;
  description: string;
  version?: string;
  tags?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

/** Agent capability registry bundle (`$defs/agentCapabilityRegistry`). */
export interface AgentCapabilityRegistry {
  agent_id: string;
  version: string;
  declarations: CapabilityDeclaration[];
}

/** Scoped agent permissions (`specs/agent/permissions.schema.json`). */
export interface AgentPermissions {
  agent_id: string;
  version: string;
  invoke?: string[];
  delegate?: string[];
  memory_scopes?: string[];
  allowed_agents?: string[];
}
