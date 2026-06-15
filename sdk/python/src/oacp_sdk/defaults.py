"""Development defaults — not for production."""

PROTOCOL_VERSION = '0.1'

DEFAULT_DEV_PUBLIC_KEY: dict[str, str] = {
    'kty': 'EC',
    'crv': 'P-256',
    'x': 'WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWlibY',
    'y': 'ALOpExF7nDwyk9V4ToWo3L5v_6Y1sQJCrcn_6OlOWf5',
    'use': 'sig',
    'alg': 'ES256',
    'kid': 'oacp-dev-key',
}
