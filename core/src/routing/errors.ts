/** Machine-readable routing error codes for the in-process message bus. */
export const ROUTING_ERROR_CODES = {
  NO_RECIPIENT: 'ROUTING_NO_RECIPIENT',
  AGENT_NOT_REGISTERED: 'ROUTING_AGENT_NOT_REGISTERED',
  DELIVERY_FAILED: 'ROUTING_DELIVERY_FAILED',
  BUS_CLOSED: 'ROUTING_BUS_CLOSED',
  UNKNOWN_MESSAGE: 'ROUTING_UNKNOWN_MESSAGE',
} as const;

export type RoutingErrorCode = (typeof ROUTING_ERROR_CODES)[keyof typeof ROUTING_ERROR_CODES];

/** Structured routing error for send/delivery failures. */
export class OacpRoutingError extends Error {
  readonly code: RoutingErrorCode;
  readonly details: readonly { path: string; message: string }[];

  constructor(
    code: RoutingErrorCode,
    message: string,
    details: readonly { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'OacpRoutingError';
    this.code = code;
    this.details = details;
  }
}
