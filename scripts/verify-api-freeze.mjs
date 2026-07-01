#!/usr/bin/env node
/**
 * Day 54 — enforce `/v1/` OpenAPI freeze.
 *
 * Fails when response component schemas change without bumping `info.version`
 * in specs/openapi/v1.json (update specs/openapi/v1.lock.json intentionally).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const openApiPath = join(repoRoot, 'specs', 'openapi', 'v1.json');
const lockPath = join(repoRoot, 'specs', 'openapi', 'v1.lock.json');

const UPDATE_LOCK = process.argv.includes('--update-lock');

const REQUIRED_V1_PATHS = [
  '/v1/openapi.json',
  '/v1/observability/runtime-config',
  '/v1/observability/snapshot',
  '/v1/observability/traces/{traceId}/graph',
  '/v1/observability/events',
  '/v1/observability/import',
];

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function fingerprintSchemas(openApiDoc) {
  const components = openApiDoc.components ?? {};
  const schemas = components.schemas ?? {};
  const paths = openApiDoc.paths ?? {};

  const responseSchemas = {};
  for (const [path, methods] of Object.entries(paths)) {
    if (!path.startsWith('/v1/')) {
      continue;
    }
    for (const [method, operation] of Object.entries(methods)) {
      if (method === 'parameters' || typeof operation !== 'object' || operation === null) {
        continue;
      }
      const responses = operation.responses ?? {};
      for (const [status, response] of Object.entries(responses)) {
        const content = response?.content ?? {};
        for (const [mediaType, media] of Object.entries(content)) {
          const schema = media?.schema;
          if (schema?.$ref) {
            const name = schema.$ref.replace('#/components/schemas/', '');
            responseSchemas[`${method.toUpperCase()} ${path} ${status} ${mediaType}`] =
              schemas[name];
          } else if (schema) {
            responseSchemas[`${method.toUpperCase()} ${path} ${status} ${mediaType}`] = schema;
          }
        }
      }
    }
  }

  const digest = createHash('sha256').update(stableStringify(responseSchemas)).digest('hex');
  return { digest, responseSchemas };
}

const openApiDoc = JSON.parse(readFileSync(openApiPath, 'utf8'));
const apiVersion = openApiDoc.info?.version;

if (typeof apiVersion !== 'string' || apiVersion.length === 0) {
  console.error('OpenAPI spec missing info.version');
  process.exit(1);
}

if (typeof openApiDoc.openapi !== 'string' || !openApiDoc.openapi.startsWith('3.1')) {
  console.error('OpenAPI spec must declare openapi 3.1.x');
  process.exit(1);
}

const specPaths = Object.keys(openApiDoc.paths ?? {});
for (const requiredPath of REQUIRED_V1_PATHS) {
  if (!specPaths.includes(requiredPath)) {
    console.error(`OpenAPI spec missing required path: ${requiredPath}`);
    process.exit(1);
  }
}

const { digest } = fingerprintSchemas(openApiDoc);
const nextLock = {
  apiVersion,
  schemaFingerprint: digest,
  paths: Object.keys(openApiDoc.paths ?? {})
    .filter((path) => path.startsWith('/v1/'))
    .sort(),
};

if (UPDATE_LOCK) {
  writeFileSync(lockPath, `${JSON.stringify(nextLock, null, 2)}\n`, 'utf8');
  console.log(
    `Updated ${lockPath} (apiVersion=${apiVersion}, fingerprint=${digest.slice(0, 12)}…)`,
  );
  process.exit(0);
}

let lock;
try {
  lock = JSON.parse(readFileSync(lockPath, 'utf8'));
} catch {
  console.error(`Missing lock file: ${lockPath}`);
  console.error('Run: node scripts/verify-api-freeze.mjs --update-lock');
  process.exit(1);
}

if (lock.schemaFingerprint === digest) {
  const missingLockedPaths = (lock.paths ?? []).filter((path) => !specPaths.includes(path));
  if (missingLockedPaths.length > 0) {
    console.error(
      'Lock file lists paths removed from OpenAPI spec:',
      missingLockedPaths.join(', '),
    );
    process.exit(1);
  }
  console.log(`API freeze OK (v${apiVersion}, fingerprint ${digest.slice(0, 12)}…)`);
  process.exit(0);
}

if (lock.apiVersion === apiVersion) {
  console.error('Breaking or non-trivial `/v1/` OpenAPI response schema change detected.');
  console.error(`  locked fingerprint: ${lock.schemaFingerprint}`);
  console.error(`  current fingerprint: ${digest}`);
  console.error('');
  console.error('Bump info.version in specs/openapi/v1.json, then run:');
  console.error('  node scripts/verify-api-freeze.mjs --update-lock');
  process.exit(1);
}

console.log(
  `API version bumped (${lock.apiVersion} → ${apiVersion}); update lock with --update-lock`,
);
process.exit(1);
