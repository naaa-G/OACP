import type { PublicKeyMaterial } from '@oacp/core';

/**
 * Development-only public key for quick local agent bootstrap.
 * Replace with a real key before production deployment.
 */
export const DEFAULT_DEV_PUBLIC_KEY: PublicKeyMaterial = {
  kty: 'EC',
  crv: 'P-256',
  x: 'WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWlibY',
  y: 'ALOpExF7nDwyk9V4ToWo3L5v_6Y1sQJCrcn_6OlOWf5',
  use: 'sig',
  alg: 'ES256',
  kid: 'oacp-dev-key',
};
