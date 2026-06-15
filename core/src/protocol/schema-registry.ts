import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AGENT_SCHEMA_PATH_LIST } from '../protocol/agent-schema-paths.js';
import {
  CORE_MESSAGE_TYPES,
  MESSAGE_TYPE_SCHEMA_PATH,
  SCHEMA_PATHS,
} from '../protocol/message-types.js';

/** Package root (`core/`), resolved from source or compiled output. */
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Bundled schemas directory (`core/schemas/`), populated by `scripts/copy-specs.mjs`. */
const SCHEMAS_ROOT = join(PACKAGE_ROOT, 'schemas');

/** Resolve a schema-relative path to an absolute filesystem path. */
export function resolveSchemaPath(relativePath: string): string {
  return join(SCHEMAS_ROOT, relativePath);
}

/** Load and parse a JSON Schema file from the bundled schemas directory. */
export function loadSchema(relativePath: string): Record<string, unknown> {
  const absolutePath = resolveSchemaPath(relativePath);
  const raw = readFileSync(absolutePath, 'utf8');
  return JSON.parse(raw) as Record<string, unknown>;
}

/** Load the OACP base schema (shared $defs and envelope). */
export function loadBaseSchema(): Record<string, unknown> {
  return loadSchema(SCHEMA_PATHS.BASE);
}

/** Load the JSON Schema for a Day 2 core message type. */
export function loadMessageSchema(
  messageType: (typeof CORE_MESSAGE_TYPES)[number],
): Record<string, unknown> {
  return loadSchema(MESSAGE_TYPE_SCHEMA_PATH[messageType]);
}

/** Load all Day 2 core message schemas keyed by message type. */
export function loadCoreMessageSchemas(): Record<
  (typeof CORE_MESSAGE_TYPES)[number],
  Record<string, unknown>
> {
  return Object.fromEntries(
    CORE_MESSAGE_TYPES.map((type) => [type, loadMessageSchema(type)]),
  ) as Record<(typeof CORE_MESSAGE_TYPES)[number], Record<string, unknown>>;
}

/** Load an agent schema by path key. */
export function loadAgentSchema(
  path: (typeof AGENT_SCHEMA_PATH_LIST)[number],
): Record<string, unknown> {
  return loadSchema(path);
}

/** Load all Day 3 agent schemas keyed by path. */
export function loadAgentSchemas(): Record<
  (typeof AGENT_SCHEMA_PATH_LIST)[number],
  Record<string, unknown>
> {
  return Object.fromEntries(
    AGENT_SCHEMA_PATH_LIST.map((path) => [path, loadAgentSchema(path)]),
  ) as Record<(typeof AGENT_SCHEMA_PATH_LIST)[number], Record<string, unknown>>;
}

/** Absolute path to the bundled schemas root (for tests and tooling). */
export function getSchemasRoot(): string {
  return SCHEMAS_ROOT;
}
