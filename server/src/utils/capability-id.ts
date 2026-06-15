import { SERVER_ERROR_CODES, OacpServerError } from '../errors.js';

/** OACP capability identifier pattern (`specs/oacp.schema.json#/$defs/capability`). */
export const CAPABILITY_ID_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*$/;

const MIN_CAPABILITY_LENGTH = 1;
const MAX_CAPABILITY_LENGTH = 128;
const MIN_DISCOVERY_LIMIT = 1;
const MAX_DISCOVERY_LIMIT = 100;
const DEFAULT_DISCOVERY_LIMIT = 10;

/** Whether a string is a valid OACP capability identifier. */
export function isValidCapabilityId(value: string): boolean {
  return (
    value.length >= MIN_CAPABILITY_LENGTH &&
    value.length <= MAX_CAPABILITY_LENGTH &&
    CAPABILITY_ID_PATTERN.test(value)
  );
}

/** Assert capability id format; throws `OacpServerError` (400) when invalid. */
export function assertValidCapabilityId(capability: string): void {
  if (!isValidCapabilityId(capability)) {
    throw new OacpServerError(
      400,
      SERVER_ERROR_CODES.VALIDATION_FAILED,
      `Invalid capability identifier "${capability}"`,
      [
        {
          path: '/capability',
          message:
            'Must be dot-notation lowercase (e.g. text.summarize), 1–128 chars, matching ^[a-z][a-z0-9]*(?:\\.[a-z][a-z0-9]*)*$',
        },
      ],
    );
  }
}

/** Parse and clamp discovery `limit` query param (default 10, max 100). */
export function parseDiscoveryLimit(raw: string | undefined): number {
  if (raw === undefined || raw.length === 0) {
    return DEFAULT_DISCOVERY_LIMIT;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new OacpServerError(400, SERVER_ERROR_CODES.VALIDATION_FAILED, 'Invalid limit query', [
      { path: '/limit', message: 'Must be an integer between 1 and 100' },
    ]);
  }

  return Math.min(MAX_DISCOVERY_LIMIT, Math.max(MIN_DISCOVERY_LIMIT, parsed));
}
