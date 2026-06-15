import { MEMORY_ERROR_CODES, OacpMemoryError } from './errors.js';

const SCOPE_PATTERN = /^[a-z][a-z0-9._-]{0,127}$/;

export const DEFAULT_MEMORY_SCOPE = 'workflow.default';

export interface MemoryScopeManagerOptions {
  readonly defaultScope?: string;
}

/**
 * Normalizes and validates memory scope identifiers.
 * Scopes isolate task history per workflow, team, or trace.
 */
export class MemoryScopeManager {
  readonly defaultScope: string;

  constructor(options: MemoryScopeManagerOptions = {}) {
    this.defaultScope = this.normalizeScope(options.defaultScope ?? DEFAULT_MEMORY_SCOPE);
  }

  /** Validate and normalize a scope string. */
  normalizeScope(scope: string): string {
    const trimmed = scope.trim().toLowerCase();
    if (!SCOPE_PATTERN.test(trimmed)) {
      throw new OacpMemoryError(
        MEMORY_ERROR_CODES.INVALID_SCOPE,
        `Invalid memory scope "${scope}"`,
        [{ path: '/scope', message: 'Scope must match /^[a-z][a-z0-9._-]{0,127}$/' }],
      );
    }
    return trimmed;
  }

  /** Scope keyed to a trace for per-workflow isolation. */
  traceScope(traceId: string): string {
    return this.normalizeScope(`workflow.trace.${traceId}`);
  }

  /** Resolve scope for a trace, falling back to the default scope. */
  resolveScope(traceId: string, explicitScope?: string): string {
    if (explicitScope !== undefined && explicitScope.length > 0) {
      return this.normalizeScope(explicitScope);
    }
    return this.traceScope(traceId);
  }
}
