import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AGENT_SCHEMA_PATHS,
  CapabilityCatalog,
  OacpValidationError,
  PROTOCOL_VERSION,
  VALIDATION_ERROR_CODES,
  assertCanDelegate,
  assertCanInvoke,
  assertIdentityRegistryConsistency,
  buildCapabilityCatalog,
  canDelegate,
  canInvoke,
  getSchemasRoot,
  isAgentUri,
  isCapabilityId,
  loadSchema,
  parseAgentIdentity,
  parseAgentPermissions,
  parseCapabilityRegistry,
  resetMessageValidatorCache,
  resetValidatorCache,
  validateAgentIdentity,
  validateAgentPermissions,
  validateCapabilityRegistry,
} from '../src/index.js';

afterEach(() => {
  resetValidatorCache();
  resetMessageValidatorCache();
});

describe('agent identity (Day 3)', () => {
  const identityExample = JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples/agent-identity.example.json'), 'utf8'),
  ) as unknown;

  it('loads agent identity schema', () => {
    const schema = loadSchema(AGENT_SCHEMA_PATHS.IDENTITY);
    expect(schema.$id).toContain('identity.schema.json');
  });

  it('validates example agent identity', () => {
    const outcome = validateAgentIdentity(identityExample);
    expect(outcome.valid).toBe(true);
    if (outcome.valid) {
      expect(outcome.data.id).toBe('agent://summarizer');
      expect(outcome.data.capabilities).toContain('text.summarize');
    }
  });

  it('parses example agent identity', () => {
    const identity = parseAgentIdentity(identityExample);
    expect(identity.name).toBe('Text Summarizer');
    expect(identity.version).toBe(PROTOCOL_VERSION);
  });

  it('rejects identity with invalid agent URI', () => {
    const invalid = {
      ...(identityExample as object),
      id: 'not-an-agent-uri',
    };
    const outcome = validateAgentIdentity(invalid);
    expect(outcome.valid).toBe(false);
  });

  it('rejects identity with empty capabilities', () => {
    const invalid = {
      ...(identityExample as object),
      capabilities: [],
    };
    const outcome = validateAgentIdentity(invalid);
    expect(outcome.valid).toBe(false);
  });

  it('validates agent URI and capability helpers', () => {
    expect(isAgentUri('agent://summarizer')).toBe(true);
    expect(isAgentUri('http://bad')).toBe(false);
    expect(isCapabilityId('text.summarize')).toBe(true);
    expect(isCapabilityId('INVALID')).toBe(false);
  });
});

describe('capability declarations (Day 3)', () => {
  const registryExample = JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples/capability-registry.example.json'), 'utf8'),
  ) as unknown;

  it('validates capability registry example', () => {
    const outcome = validateCapabilityRegistry(registryExample);
    expect(outcome.valid).toBe(true);
  });

  it('builds capability catalog from registry', () => {
    const identity = parseAgentIdentity(
      JSON.parse(
        readFileSync(join(getSchemasRoot(), 'examples/agent-identity.example.json'), 'utf8'),
      ) as unknown,
    );
    const registry = parseCapabilityRegistry(registryExample);
    const catalog = buildCapabilityCatalog(identity, registry);

    expect(catalog.has('text.summarize')).toBe(true);
    expect(catalog.list()).toHaveLength(1);
  });

  it('detects identity/registry capability mismatch', () => {
    const identity = parseAgentIdentity(
      JSON.parse(
        readFileSync(join(getSchemasRoot(), 'examples/agent-identity.example.json'), 'utf8'),
      ) as unknown,
    );
    const registry = parseCapabilityRegistry(registryExample);
    registry.declarations.push({
      id: 'code.generate',
      name: 'Code Generation',
      description: 'Generates code.',
    });

    expect(() => {
      assertIdentityRegistryConsistency(identity, registry);
    }).toThrow(OacpValidationError);
  });

  it('prevents duplicate capability registration', () => {
    const catalog = new CapabilityCatalog();
    const declaration = {
      id: 'text.summarize',
      name: 'Summarize',
      description: 'Summarizes text.',
    };
    catalog.register(declaration);
    expect(() => {
      catalog.register(declaration);
    }).toThrow(OacpValidationError);
  });
});

describe('agent permissions (Day 3)', () => {
  const permissionsExample = JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples/agent-permissions.example.json'), 'utf8'),
  ) as unknown;

  it('validates permissions example', () => {
    const outcome = validateAgentPermissions(permissionsExample);
    expect(outcome.valid).toBe(true);
  });

  it('enforces invoke and delegate permissions', () => {
    const permissions = parseAgentPermissions(permissionsExample);

    expect(canInvoke(permissions, 'text.summarize')).toBe(true);
    expect(canInvoke(permissions, 'code.review')).toBe(false);

    expect(canDelegate(permissions, 'text.summarize', 'agent://summarizer')).toBe(true);
    expect(canDelegate(permissions, 'text.summarize', 'agent://unknown')).toBe(false);

    assertCanInvoke(permissions, 'text.summarize');
    expect(() => {
      assertCanInvoke(permissions, 'code.review');
    }).toThrow(OacpValidationError);
    expect(() => {
      assertCanDelegate(permissions, 'text.summarize', 'agent://unknown');
    }).toThrow(OacpValidationError);
  });

  it('throws with PERMISSION_DENIED code', () => {
    const permissions = parseAgentPermissions(permissionsExample);
    try {
      assertCanInvoke(permissions, 'forbidden.cap');
    } catch (error) {
      expect(error).toBeInstanceOf(OacpValidationError);
      expect((error as OacpValidationError).code).toBe(VALIDATION_ERROR_CODES.PERMISSION_DENIED);
    }
  });
});
