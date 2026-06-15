/** Machine-readable validation error codes for OACP protocol and agent models. */
export const VALIDATION_ERROR_CODES = {
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  IDENTITY_CAPABILITY_MISMATCH: 'IDENTITY_CAPABILITY_MISMATCH',
  DUPLICATE_CAPABILITY: 'DUPLICATE_CAPABILITY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_AGENT_URI: 'INVALID_AGENT_URI',
  INVALID_MESSAGE_STRUCTURE: 'INVALID_MESSAGE_STRUCTURE',
  UNKNOWN_MESSAGE_TYPE: 'UNKNOWN_MESSAGE_TYPE',
  UNSUPPORTED_PROTOCOL_VERSION: 'UNSUPPORTED_PROTOCOL_VERSION',
  MESSAGE_TYPE_MISMATCH: 'MESSAGE_TYPE_MISMATCH',
} as const;

export type ValidationErrorCode =
  (typeof VALIDATION_ERROR_CODES)[keyof typeof VALIDATION_ERROR_CODES];

/** Structured validation error with machine-readable code. */
export class OacpValidationError extends Error {
  readonly code: ValidationErrorCode;
  readonly details: readonly ValidationIssue[];

  constructor(
    code: ValidationErrorCode,
    message: string,
    details: readonly ValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'OacpValidationError';
    this.code = code;
    this.details = details;
  }
}

/** Single schema validation issue from AJV or consistency checks. */
export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

/** Result of a validation operation. */
export interface ValidationResult<T> {
  readonly valid: true;
  readonly data: T;
}

export interface ValidationFailure {
  readonly valid: false;
  readonly error: OacpValidationError;
}

export type ValidateOutcome<T> = ValidationResult<T> | ValidationFailure;

/** Assert validation succeeded or throw `OacpValidationError`. */
export function assertValid<T>(outcome: ValidateOutcome<T>): T {
  if (!outcome.valid) {
    throw outcome.error;
  }
  return outcome.data;
}
