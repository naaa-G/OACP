/** Machine-readable HTTP API error codes for the reference server. */
export const SERVER_ERROR_CODES = {
  VALIDATION_FAILED: 'SERVER_VALIDATION_FAILED',
  ROUTING_FAILED: 'SERVER_ROUTING_FAILED',
  AGENT_NOT_FOUND: 'SERVER_AGENT_NOT_FOUND',
  AGENT_ALREADY_REGISTERED: 'SERVER_AGENT_ALREADY_REGISTERED',
  INVALID_AGENT_ID: 'SERVER_INVALID_AGENT_ID',
  BUS_CLOSED: 'SERVER_BUS_CLOSED',
  INTERNAL_ERROR: 'SERVER_INTERNAL_ERROR',
} as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[keyof typeof SERVER_ERROR_CODES];

export interface ApiErrorBody {
  readonly code: ServerErrorCode;
  readonly message: string;
  readonly details?: readonly { path: string; message: string }[];
}

export interface ApiErrorResponse {
  readonly error: ApiErrorBody;
}

export class OacpServerError extends Error {
  readonly statusCode: number;
  readonly code: ServerErrorCode;
  readonly details: readonly { path: string; message: string }[];

  constructor(
    statusCode: number,
    code: ServerErrorCode,
    message: string,
    details: readonly { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'OacpServerError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toJSON(): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details.length > 0 ? { details: this.details } : {}),
      },
    };
  }
}
