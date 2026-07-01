import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CORE_MESSAGE_TYPES,
  MESSAGE_TYPE_SCHEMA_PATH,
  MESSAGE_TYPES,
  PROTOCOL_VERSION,
  loadBaseSchema,
  loadCoreMessageSchemas,
  loadMessageSchema,
  loadSchema,
  getSchemasRoot,
} from '../src/index.js';

describe('protocol schemas (Day 2)', () => {
  it('exports protocol version matching schemas', () => {
    const base = loadBaseSchema();
    const defs = base.$defs as Record<string, { enum?: string[]; const?: string }>;
    const protocolVersion = defs['protocolVersion'];
    expect(protocolVersion?.enum ?? [protocolVersion?.const]).toContain(PROTOCOL_VERSION);
  });

  it('loads base schema with JSON Schema 2020-12 and shared $defs', () => {
    const schema = loadBaseSchema();
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.$defs).toBeTypeOf('object');
    expect(schema.$defs).toHaveProperty('messageEnvelope');
  });

  it.each(CORE_MESSAGE_TYPES)('loads %s schema with stable $id', (messageType) => {
    const schema = loadMessageSchema(messageType);
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.$id).toContain(messageType);
    expect(schema.allOf).toBeDefined();
  });

  it('loads all core message schemas', () => {
    const schemas = loadCoreMessageSchemas();
    expect(Object.keys(schemas).sort()).toEqual([...CORE_MESSAGE_TYPES].sort());
  });

  it('maps message types to schema paths', () => {
    for (const type of CORE_MESSAGE_TYPES) {
      expect(loadSchema(MESSAGE_TYPE_SCHEMA_PATH[type]).$id).toContain(type);
    }
  });

  it('example message payloads use supported Day 2 message types', () => {
    const examplesDir = join(getSchemasRoot(), 'examples');
    const files = readdirSync(examplesDir).filter((file) => file.endsWith('.json'));

    const messageExamples = files.filter(
      (file) =>
        file.startsWith('task_') ||
        file.startsWith('delegation') ||
        file.startsWith('capability_query'),
    );

    expect(messageExamples.length).toBeGreaterThan(0);

    for (const file of messageExamples) {
      const payload = JSON.parse(readFileSync(join(examplesDir, file), 'utf8')) as {
        type: string;
        version: string;
      };
      expect(payload.version).toBe(PROTOCOL_VERSION);
      expect(CORE_MESSAGE_TYPES).toContain(payload.type);
    }
  });

  it('exports all message type constants', () => {
    expect(MESSAGE_TYPES.TASK_REQUEST).toBe('task_request');
    expect(MESSAGE_TYPES.TASK_RESPONSE).toBe('task_response');
    expect(MESSAGE_TYPES.DELEGATION).toBe('delegation');
    expect(MESSAGE_TYPES.CAPABILITY_QUERY).toBe('capability_query');
  });
});
