import { AGENT_SCHEMA_PATHS } from './agent-schema-paths.js';
import type { AgentIdentity } from './agent-types.js';
import type { ValidateOutcome } from './errors.js';
import {
  compileSchemaValidator,
  validateAgainstSchema,
  validateAgainstSchemaOrThrow,
} from './validator.js';

let identityValidator: ReturnType<typeof compileSchemaValidator> | undefined;

function getIdentityValidator(): ReturnType<typeof compileSchemaValidator> {
  identityValidator ??= compileSchemaValidator(AGENT_SCHEMA_PATHS.IDENTITY);
  return identityValidator;
}

/** Validate an agent identity record against `specs/agent/identity.schema.json`. */
export function validateAgentIdentity(data: unknown): ValidateOutcome<AgentIdentity> {
  const outcome = validateAgainstSchema(getIdentityValidator(), data, 'Agent identity');
  if (!outcome.valid) {
    return outcome;
  }
  return { valid: true, data: outcome.data as AgentIdentity };
}

/** Validate agent identity or throw `OacpValidationError`. */
export function parseAgentIdentity(data: unknown): AgentIdentity {
  return validateAgainstSchemaOrThrow(
    getIdentityValidator(),
    data,
    'Agent identity',
  ) as AgentIdentity;
}

/** Type guard for agent identity URI format (`agent://…`). */
export function isAgentUri(value: string): boolean {
  return /^agent:\/\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value);
}

/** Type guard for capability identifier format (dot notation). */
export function isCapabilityId(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*$/.test(value) && value.length <= 128;
}

/** Returns capability IDs declared on an agent identity. */
export function getDeclaredCapabilities(identity: AgentIdentity): readonly string[] {
  return identity.capabilities;
}
