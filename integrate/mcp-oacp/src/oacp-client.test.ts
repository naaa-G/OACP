import { describe, expect, it } from 'vitest';

import { buildConsoleTraceUrl, OacpHttpClient } from './oacp-client.js';

describe('OacpHttpClient', () => {
  it('builds console trace URLs', () => {
    expect(buildConsoleTraceUrl('http://127.0.0.1:3847', 'abc-123')).toBe(
      'http://127.0.0.1:3847/console/?trace_id=abc-123&mode=showcase',
    );
    expect(buildConsoleTraceUrl('http://127.0.0.1:3847/console', 'abc-123', 'ops')).toBe(
      'http://127.0.0.1:3847/console/?trace_id=abc-123&mode=ops',
    );
  });

  it('exposes serverUrl', () => {
    const client = new OacpHttpClient({ baseUrl: 'http://127.0.0.1:3847/' });
    expect(client.serverUrl).toBe('http://127.0.0.1:3847');
  });
});
