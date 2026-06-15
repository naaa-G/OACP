import type { ValidationIssue } from '../protocol/errors.js';

export const MEMORY_ERROR_CODES = {
  INVALID_SCOPE: 'INVALID_SCOPE',
  STORE_CLOSED: 'STORE_CLOSED',
  ENTRY_NOT_FOUND: 'ENTRY_NOT_FOUND',
  BACKEND_ERROR: 'BACKEND_ERROR',
} as const;

export type MemoryErrorCode = (typeof MEMORY_ERROR_CODES)[keyof typeof MEMORY_ERROR_CODES];

/** Memory subsystem error with structured code and optional field details. */
export class OacpMemoryError extends Error {
  readonly code: MemoryErrorCode;
  readonly details: readonly ValidationIssue[];

  constructor(code: MemoryErrorCode, message: string, details: readonly ValidationIssue[] = []) {
    super(message);
    this.name = 'OacpMemoryError';
    this.code = code;
    this.details = details;
  }
}
