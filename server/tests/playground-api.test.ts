import { afterAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers.js';

describe('playground HTTP API (Day 22)', () => {
  const { app, context } = createTestApp();

  afterAll(async () => {
    await context.memoryStore.close();
    await app.close();
  });

  it('redirects GET /playground to /console with query passthrough (Day 7)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/playground?trace_id=trace-1',
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/console/?trace_id=trace-1');
  });

  it('returns 410 Gone for GET /playground/snapshot (Day 60)', async () => {
    const snapshotResponse = await app.inject({
      method: 'GET',
      url: '/playground/snapshot?trace_id=trace-1',
    });

    expect(snapshotResponse.statusCode).toBe(410);
    expect(snapshotResponse.json()).toMatchObject({
      ok: false,
      error: { successor: '/v1/observability/snapshot' },
    });
  });
});
