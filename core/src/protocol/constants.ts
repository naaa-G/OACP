/** Active OACP protocol version (v1.0 freeze — Day 54). */
export const PROTOCOL_VERSION = '1.0' as const;

/** @oacp/core package version. */
export const PACKAGE_VERSION = '1.0.0' as const;

export type ProtocolVersion = typeof PROTOCOL_VERSION;
