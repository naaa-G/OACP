/** Relative paths to agent JSON Schemas (within bundled `core/schemas/`). */
export const AGENT_SCHEMA_PATHS = {
  IDENTITY: 'agent/identity.schema.json',
  CAPABILITIES: 'agent/capabilities.schema.json',
  PERMISSIONS: 'agent/permissions.schema.json',
} as const;

export type AgentSchemaPath = (typeof AGENT_SCHEMA_PATHS)[keyof typeof AGENT_SCHEMA_PATHS];

/** All Day 3 agent schema paths. */
export const AGENT_SCHEMA_PATH_LIST = [
  AGENT_SCHEMA_PATHS.IDENTITY,
  AGENT_SCHEMA_PATHS.CAPABILITIES,
  AGENT_SCHEMA_PATHS.PERMISSIONS,
] as const;
