import { PROTOCOL_VERSION } from './constants.js';

/** Protocol versions accepted by the message validator (0.1 read-compat during migration). */
export const SUPPORTED_PROTOCOL_VERSIONS = [PROTOCOL_VERSION, '0.1'] as const;

export type SupportedProtocolVersion = (typeof SUPPORTED_PROTOCOL_VERSIONS)[number];

/** Check whether a value is a supported OACP protocol version string. */
export function isSupportedProtocolVersion(version: unknown): version is SupportedProtocolVersion {
  return (
    typeof version === 'string' &&
    (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(version)
  );
}
