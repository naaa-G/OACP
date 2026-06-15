/**
 * Delivery semantics for message transport.
 * In-process bus uses at-most-once; networked transports add retries (Week 2).
 */
export type DeliveryGuarantee = 'at-most-once' | 'at-least-once' | 'exactly-once';

/** Default guarantee for the local in-memory message bus. */
export const LOCAL_BUS_DELIVERY_GUARANTEE: DeliveryGuarantee = 'at-most-once';

/**
 * Default guarantee for remote HTTP transport with client retries (Day 12).
 * Handlers should be idempotent or dedupe on `message_id`.
 */
export const REMOTE_HTTP_DELIVERY_GUARANTEE: DeliveryGuarantee = 'at-least-once';
