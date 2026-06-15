/** Supported OACP protocol version. */
export const PROTOCOL_VERSION = '0.1' as const;

/** @oacp/core package version. */
export const PACKAGE_VERSION = '0.1.0' as const;

export type ProtocolVersion = typeof PROTOCOL_VERSION;
