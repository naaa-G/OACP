import { AGENT_SCHEMA_PATHS } from './agent-schema-paths.js';
import type { AgentPermissions } from './agent-types.js';
import type { ValidateOutcome } from './errors.js';
import { OacpValidationError, VALIDATION_ERROR_CODES } from './errors.js';
import {
  compileSchemaValidator,
  validateAgainstSchema,
  validateAgainstSchemaOrThrow,
} from './validator.js';

let permissionsValidator: ReturnType<typeof compileSchemaValidator> | undefined;

function getPermissionsValidator(): ReturnType<typeof compileSchemaValidator> {
  permissionsValidator ??= compileSchemaValidator(AGENT_SCHEMA_PATHS.PERMISSIONS);
  return permissionsValidator;
}

/** Validate agent permissions against `specs/agent/permissions.schema.json`. */
export function validateAgentPermissions(data: unknown): ValidateOutcome<AgentPermissions> {
  const outcome = validateAgainstSchema(getPermissionsValidator(), data, 'Agent permissions');
  if (!outcome.valid) {
    return outcome;
  }
  return { valid: true, data: outcome.data as AgentPermissions };
}

/** Validate agent permissions or throw. */
export function parseAgentPermissions(data: unknown): AgentPermissions {
  return validateAgainstSchemaOrThrow(
    getPermissionsValidator(),
    data,
    'Agent permissions',
  ) as AgentPermissions;
}

/** Check whether permissions allow invoking a capability on another agent. */
export function canInvoke(permissions: AgentPermissions, capability: string): boolean {
  const allowed = permissions.invoke ?? [];
  return allowed.includes(capability);
}

/** Check whether permissions allow delegating a capability. */
export function canDelegate(
  permissions: AgentPermissions,
  capability: string,
  targetAgentId?: string,
): boolean {
  const allowed = permissions.delegate ?? [];
  if (!allowed.includes(capability)) {
    return false;
  }
  if (targetAgentId && permissions.allowed_agents && permissions.allowed_agents.length > 0) {
    return permissions.allowed_agents.includes(targetAgentId);
  }
  return true;
}

/** Check memory scope access. */
export function canAccessMemoryScope(permissions: AgentPermissions, scope: string): boolean {
  const scopes = permissions.memory_scopes ?? [];
  return scopes.includes(scope);
}

/** Assert permission to invoke; throws `OacpValidationError` if denied. */
export function assertCanInvoke(permissions: AgentPermissions, capability: string): void {
  if (!canInvoke(permissions, capability)) {
    throw new OacpValidationError(
      VALIDATION_ERROR_CODES.PERMISSION_DENIED,
      `Agent ${permissions.agent_id} is not permitted to invoke capability: ${capability}`,
    );
  }
}

/** Assert permission to delegate; throws `OacpValidationError` if denied. */
export function assertCanDelegate(
  permissions: AgentPermissions,
  capability: string,
  targetAgentId?: string,
): void {
  if (!canDelegate(permissions, capability, targetAgentId)) {
    throw new OacpValidationError(
      VALIDATION_ERROR_CODES.PERMISSION_DENIED,
      `Agent ${permissions.agent_id} is not permitted to delegate capability: ${capability}`,
    );
  }
}
