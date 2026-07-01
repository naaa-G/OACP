import { describe, expect, it, vi } from 'vitest';

import { buildObservabilityAuthHeaders, createObservabilityFetch } from './auth.js';
import { buildObservabilityEventsUrl } from './event-stream.js';

describe('observability auth (Day 52)', () => {
  it('buildObservabilityAuthHeaders returns Bearer token', () => {
    expect(buildObservabilityAuthHeaders('secret')).toEqual({
      Authorization: 'Bearer secret',
    });
    expect(buildObservabilityAuthHeaders('')).toEqual({});
    expect(buildObservabilityAuthHeaders(undefined)).toEqual({});
  });

  it('createObservabilityFetch attaches Authorization', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const authedFetch = createObservabilityFetch('my-key', fetchImpl as typeof fetch);

    await authedFetch('https://example.test/snapshot');

    expect(fetchImpl).toHaveBeenCalledWith('https://example.test/snapshot', {
      headers: { Authorization: 'Bearer my-key' },
    });
  });

  it('buildObservabilityEventsUrl includes api_key for SSE', () => {
    expect(
      buildObservabilityEventsUrl({
        apiKey: 'sse-key',
        traceId: 'trace-1',
      }),
    ).toBe('/v1/observability/events?trace_id=trace-1&api_key=sse-key');
  });
});
