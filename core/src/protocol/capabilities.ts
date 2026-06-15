import { AGENT_SCHEMA_PATHS } from './agent-schema-paths.js';
import type { AgentCapabilityRegistry, CapabilityDeclaration } from './agent-types.js';
import type { AgentIdentity } from './agent-types.js';
import { OacpValidationError, VALIDATION_ERROR_CODES } from './errors.js';
import type { ValidateOutcome } from './errors.js';
import {
  compileSchemaRefValidator,
  validateAgainstSchema,
  validateAgainstSchemaOrThrow,
} from './validator.js';

let declarationValidator: ReturnType<typeof compileSchemaRefValidator> | undefined;
let registryValidator: ReturnType<typeof compileSchemaRefValidator> | undefined;

function getDeclarationValidator(): ReturnType<typeof compileSchemaRefValidator> {
  declarationValidator ??= compileSchemaRefValidator(
    AGENT_SCHEMA_PATHS.CAPABILITIES,
    '#/$defs/capabilityDeclaration',
  );
  return declarationValidator;
}

function getRegistryValidator(): ReturnType<typeof compileSchemaRefValidator> {
  registryValidator ??= compileSchemaRefValidator(
    AGENT_SCHEMA_PATHS.CAPABILITIES,
    '#/$defs/agentCapabilityRegistry',
  );
  return registryValidator;
}

/** Validate a single capability declaration. */
export function validateCapabilityDeclaration(
  data: unknown,
): ValidateOutcome<CapabilityDeclaration> {
  const outcome = validateAgainstSchema(getDeclarationValidator(), data, 'Capability declaration');
  if (!outcome.valid) {
    return outcome;
  }
  return { valid: true, data: outcome.data as CapabilityDeclaration };
}

/** Validate a capability declaration or throw. */
export function parseCapabilityDeclaration(data: unknown): CapabilityDeclaration {
  return validateAgainstSchemaOrThrow(
    getDeclarationValidator(),
    data,
    'Capability declaration',
  ) as CapabilityDeclaration;
}

/** Validate an agent capability registry bundle. */
export function validateCapabilityRegistry(
  data: unknown,
): ValidateOutcome<AgentCapabilityRegistry> {
  const outcome = validateAgainstSchema(getRegistryValidator(), data, 'Capability registry');
  if (!outcome.valid) {
    return outcome;
  }
  return { valid: true, data: outcome.data as AgentCapabilityRegistry };
}

/** Validate a capability registry or throw. */
export function parseCapabilityRegistry(data: unknown): AgentCapabilityRegistry {
  return validateAgainstSchemaOrThrow(
    getRegistryValidator(),
    data,
    'Capability registry',
  ) as AgentCapabilityRegistry;
}

/** In-memory catalog of capability declarations for one agent. */
export class CapabilityCatalog {
  private readonly declarations = new Map<string, CapabilityDeclaration>();

  /** Register a validated capability declaration. */
  register(declaration: CapabilityDeclaration): void {
    const outcome = validateCapabilityDeclaration(declaration);
    if (!outcome.valid) {
      throw outcome.error;
    }
    if (this.declarations.has(outcome.data.id)) {
      throw new OacpValidationError(
        VALIDATION_ERROR_CODES.DUPLICATE_CAPABILITY,
        `Capability already registered: ${outcome.data.id}`,
      );
    }
    this.declarations.set(outcome.data.id, outcome.data);
  }

  /** Register multiple declarations from a registry bundle. */
  loadRegistry(registry: AgentCapabilityRegistry): void {
    const outcome = validateCapabilityRegistry(registry);
    if (!outcome.valid) {
      throw outcome.error;
    }
    for (const declaration of outcome.data.declarations) {
      if (this.declarations.has(declaration.id)) {
        throw new OacpValidationError(
          VALIDATION_ERROR_CODES.DUPLICATE_CAPABILITY,
          `Duplicate capability in registry: ${declaration.id}`,
        );
      }
      this.declarations.set(declaration.id, declaration);
    }
  }

  /** Check whether a capability is registered. */
  has(capabilityId: string): boolean {
    return this.declarations.has(capabilityId);
  }

  /** Get a capability declaration by ID. */
  get(capabilityId: string): CapabilityDeclaration | undefined {
    return this.declarations.get(capabilityId);
  }

  /** List all registered capability declarations. */
  list(): CapabilityDeclaration[] {
    return [...this.declarations.values()];
  }

  /** List registered capability IDs. */
  ids(): string[] {
    return [...this.declarations.keys()];
  }
}

/** Ensure identity capability IDs match registry declarations exactly. */
export function assertIdentityRegistryConsistency(
  identity: AgentIdentity,
  registry: AgentCapabilityRegistry,
): void {
  if (identity.id !== registry.agent_id) {
    throw new OacpValidationError(
      VALIDATION_ERROR_CODES.IDENTITY_CAPABILITY_MISMATCH,
      `Identity id ${identity.id} does not match registry agent_id ${registry.agent_id}`,
    );
  }

  const identityCaps = new Set(identity.capabilities);
  const registryCaps = new Set(registry.declarations.map((d) => d.id));

  const missingInRegistry = identity.capabilities.filter((c) => !registryCaps.has(c));
  const extraInRegistry = registry.declarations.filter((d) => !identityCaps.has(d.id));

  if (missingInRegistry.length > 0 || extraInRegistry.length > 0) {
    throw new OacpValidationError(
      VALIDATION_ERROR_CODES.IDENTITY_CAPABILITY_MISMATCH,
      'Identity capabilities must match registry declarations exactly',
      [
        ...(missingInRegistry.length > 0
          ? [
              {
                path: '/capabilities',
                message: `Missing declarations for: ${missingInRegistry.join(', ')}`,
              },
            ]
          : []),
        ...(extraInRegistry.length > 0
          ? [
              {
                path: '/declarations',
                message: `Extra declarations: ${extraInRegistry.map((d) => d.id).join(', ')}`,
              },
            ]
          : []),
      ],
    );
  }
}

/** Build a capability catalog from a registry and verify consistency with identity. */
export function buildCapabilityCatalog(
  identity: AgentIdentity,
  registry: AgentCapabilityRegistry,
): CapabilityCatalog {
  assertIdentityRegistryConsistency(identity, registry);
  const catalog = new CapabilityCatalog();
  catalog.loadRegistry(registry);
  return catalog;
}
