import { isAgentUri } from '@oacp/core';

import { SERVER_ERROR_CODES, OacpServerError } from '../errors.js';

/**
 * Normalize a path parameter to a canonical `agent://` URI.
 * Accepts `summarizer` or `agent://summarizer`.
 */
export function normalizeAgentUriParam(agentParam: string): string {
  const decoded = decodeURIComponent(agentParam).trim();
  if (!decoded) {
    throw new OacpServerError(400, SERVER_ERROR_CODES.INVALID_AGENT_ID, 'Agent id is required');
  }

  const candidate = decoded.startsWith('agent://') ? decoded : `agent://${decoded}`;
  if (!isAgentUri(candidate)) {
    throw new OacpServerError(
      400,
      SERVER_ERROR_CODES.INVALID_AGENT_ID,
      `Invalid agent URI "${decoded}"`,
      [{ path: '/agent/:id', message: 'Expected agent://… URI or short name' }],
    );
  }

  return candidate;
}
