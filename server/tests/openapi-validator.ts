import { getAjv } from '@oacp/core';

import { loadOpenApiDocument } from '../src/observability/openapi.js';

type JsonValidator = {
  (data: unknown): boolean;
  errors?: Array<{ instancePath?: string; message?: string }> | null;
};

type OpenApiDocument = {
  readonly components?: {
    readonly schemas?: Record<string, unknown>;
  };
  readonly paths?: Record<
    string,
    Record<string, OpenApiOperation | readonly unknown[] | undefined> | undefined
  >;
};

interface OpenApiOperation {
  readonly responses?: Record<
    string,
    {
      readonly content?: Record<string, { readonly schema?: OpenApiSchema }>;
    }
  >;
}

type OpenApiSchema = Record<string, unknown> & {
  readonly $ref?: string;
};

const validatorCache = new Map<string, JsonValidator>();

function resolveJsonPointer(document: OpenApiDocument, pointer: string): unknown {
  if (!pointer.startsWith('#/')) {
    throw new Error(`Unsupported OpenAPI $ref: ${pointer}`);
  }

  const segments = pointer
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = document;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') {
      throw new Error(`OpenAPI $ref segment not found: ${pointer}`);
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function dereferenceSchema(
  document: OpenApiDocument,
  schema: OpenApiSchema,
  stack: readonly string[] = [],
): Record<string, unknown> {
  if (schema.$ref !== undefined) {
    if (stack.includes(schema.$ref)) {
      return { type: 'object' };
    }
    const resolved = resolveJsonPointer(document, schema.$ref);
    if (resolved === null || typeof resolved !== 'object') {
      throw new Error(`OpenAPI $ref did not resolve to schema: ${schema.$ref}`);
    }
    return dereferenceSchema(document, resolved as OpenApiSchema, [...stack, schema.$ref]);
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === '$ref') {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = dereferenceSchema(document, value as OpenApiSchema, stack);
      continue;
    }
    if (Array.isArray(value)) {
      output[key] = value.map((item) =>
        item !== null && typeof item === 'object'
          ? dereferenceSchema(document, item as OpenApiSchema, stack)
          : item,
      );
      continue;
    }
    output[key] = value;
  }
  return output;
}

function responseValidatorKey(
  path: string,
  method: string,
  statusCode: number,
  mediaType: string,
): string {
  return `${method.toUpperCase()} ${path} ${statusCode} ${mediaType}`;
}

function compileResponseValidator(
  document: OpenApiDocument,
  path: string,
  method: string,
  statusCode: number,
  mediaType: string,
): JsonValidator {
  const key = responseValidatorKey(path, method, statusCode, mediaType);
  const cached = validatorCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const operation = document.paths?.[path]?.[method.toLowerCase()] as OpenApiOperation | undefined;
  const schema = operation?.responses?.[String(statusCode)]?.content?.[mediaType]?.schema;
  if (schema === undefined) {
    throw new Error(`No OpenAPI response schema for ${key}`);
  }

  const resolved = dereferenceSchema(document, schema);
  const validate = getAjv().compile(resolved) as JsonValidator;
  validatorCache.set(key, validate);
  return validate;
}

/** Assert helper for tests — throws with AJV error detail on mismatch. */
export function assertValidOpenApiJsonResponse(
  path: string,
  method: string,
  statusCode: number,
  body: unknown,
  mediaType = 'application/json',
): void {
  const document = loadOpenApiDocument() as OpenApiDocument;
  const validate = compileResponseValidator(document, path, method, statusCode, mediaType);
  if (validate(body)) {
    return;
  }

  const detail = (validate.errors ?? [])
    .map((issue) => `${issue.instancePath || '/'}: ${issue.message ?? 'Validation failed'}`)
    .join('; ');
  throw new Error(`OpenAPI validation failed for ${method.toUpperCase()} ${path}: ${detail}`);
}
