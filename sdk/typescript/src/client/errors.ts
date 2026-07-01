/** Machine-readable client error codes for remote HTTP transport. */
export const CLIENT_ERROR_CODES = {
  NETWORK_ERROR: 'CLIENT_NETWORK_ERROR',
  TIMEOUT: 'CLIENT_TIMEOUT',
  UNAUTHORIZED: 'CLIENT_UNAUTHORIZED',
  SERVER_ERROR: 'CLIENT_SERVER_ERROR',
  VALIDATION_FAILED: 'CLIENT_VALIDATION_FAILED',
  ROUTING_FAILED: 'CLIENT_ROUTING_FAILED',
  AGENT_NOT_FOUND: 'CLIENT_AGENT_NOT_FOUND',
  RESPONSE_TIMEOUT: 'CLIENT_RESPONSE_TIMEOUT',
  INVALID_RESPONSE: 'CLIENT_INVALID_RESPONSE',
} as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES];

export interface ClientErrorDetail {
  readonly path: string;
  readonly message: string;
}

/** Structured error for `@oacp/sdk` remote HTTP operations. */
export class OacpClientError extends Error {
  readonly code: ClientErrorCode;
  readonly statusCode?: number;
  readonly details: readonly ClientErrorDetail[];

  constructor(
    code: ClientErrorCode,
    message: string,
    options: { statusCode?: number; details?: readonly ClientErrorDetail[] } = {},
  ) {
    super(message);
    this.name = 'OacpClientError';
    this.code = code;
    this.details = options.details ?? [];
    if (options.statusCode !== undefined) {
      this.statusCode = options.statusCode;
    }
  }
}
