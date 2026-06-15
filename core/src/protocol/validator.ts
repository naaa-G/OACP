import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv/dist/2020.js';
import formatsModule from 'ajv-formats';

import { OacpValidationError, VALIDATION_ERROR_CODES } from './errors.js';
import type { ValidationIssue } from './errors.js';
import { loadBaseSchema, loadSchema } from './schema-registry.js';

type AjvInstance = Ajv2020;

let ajvInstance: AjvInstance | undefined;
const compiledValidators = new Map<string, ValidateFunction>();

/** Register standard JSON Schema formats (uuid, date-time, etc.) on an AJV instance. */
function registerFormats(ajv: AjvInstance): void {
  const plugin = formatsModule as unknown as (instance: AjvInstance) => AjvInstance;
  plugin(ajv);
}

/** Shared AJV instance configured for OACP JSON Schemas (2020-12). */
export function getAjv(): AjvInstance {
  if (!ajvInstance) {
    ajvInstance = new Ajv2020({
      strict: true,
      allErrors: true,
      validateSchema: false,
    });
    registerFormats(ajvInstance);
    ajvInstance.addSchema(loadBaseSchema());
  }
  return ajvInstance;
}

/** Reset validator state (for tests). */
export function resetValidatorCache(): void {
  ajvInstance = undefined;
  compiledValidators.clear();
}

function formatAjvIssues(errors: ValidateFunction['errors']): ValidationIssue[] {
  if (!errors) {
    return [];
  }
  return errors.map((issue) => ({
    path: issue.instancePath || '/',
    message: issue.message ?? 'Validation failed',
  }));
}

/** Compile and cache a validator for a schema file (relative to bundled schemas root). */
export function compileSchemaValidator(relativeSchemaPath: string): ValidateFunction {
  const cached = compiledValidators.get(relativeSchemaPath);
  if (cached) {
    return cached;
  }

  const ajv = getAjv();
  const schema = loadSchema(relativeSchemaPath);
  const schemaId = schema.$id;
  if (typeof schemaId === 'string') {
    try {
      ajv.addSchema(schema);
    } catch {
      // Schema already registered — safe to continue.
    }
    const validate = ajv.compile({ $ref: schemaId });
    compiledValidators.set(relativeSchemaPath, validate);
    return validate;
  }
  const validate = ajv.compile(schema);
  compiledValidators.set(relativeSchemaPath, validate);
  return validate;
}

/** Compile a sub-schema by `$ref` pointer within a schema file. */
export function compileSchemaRefValidator(
  relativeSchemaPath: string,
  refPointer: string,
): ValidateFunction {
  const cacheKey = `${relativeSchemaPath}#${refPointer}`;
  const cached = compiledValidators.get(cacheKey);
  if (cached) {
    return cached;
  }

  const ajv = getAjv();
  const schema = loadSchema(relativeSchemaPath);
  const schemaId = schema.$id;
  if (typeof schemaId !== 'string') {
    throw new Error(`Schema ${relativeSchemaPath} is missing a string $id`);
  }

  ajv.addSchema(schema);
  const validate = ajv.compile({ $ref: `${schemaId}${refPointer}` });
  compiledValidators.set(cacheKey, validate);
  return validate;
}

/** Validate data against a compiled JSON Schema validator. */
export function validateAgainstSchema(
  validate: ValidateFunction,
  data: unknown,
  label: string,
): { valid: true; data: unknown } | { valid: false; error: OacpValidationError } {
  if (validate(data)) {
    return { valid: true, data };
  }

  const issues = formatAjvIssues(validate.errors);
  return {
    valid: false,
    error: new OacpValidationError(
      VALIDATION_ERROR_CODES.SCHEMA_VALIDATION_FAILED,
      `${label} failed JSON Schema validation`,
      issues,
    ),
  };
}

/** Validate unknown data; throws `OacpValidationError` on failure. */
export function validateAgainstSchemaOrThrow(
  validate: ValidateFunction,
  data: unknown,
  label: string,
): unknown {
  const outcome = validateAgainstSchema(validate, data, label);
  if (!outcome.valid) {
    throw outcome.error;
  }
  return outcome.data;
}
