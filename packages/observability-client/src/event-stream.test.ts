import { describe, expect, it } from 'vitest';

import { buildObservabilityEventsUrl } from './event-stream.js';

describe('buildObservabilityEventsUrl', () => {
  it('uses a same-origin relative path when baseUrl is empty', () => {
    expect(
      buildObservabilityEventsUrl({
        traceId: 'ae8ae735-9794-480c-b445-47c02265215b',
      }),
    ).toBe('/v1/observability/events?trace_id=ae8ae735-9794-480c-b445-47c02265215b');
  });

  it('prefixes an explicit API base URL', () => {
    expect(
      buildObservabilityEventsUrl({
        baseUrl: 'http://127.0.0.1:3001',
        traceId: 'ae8ae735-9794-480c-b445-47c02265215b',
      }),
    ).toBe(
      'http://127.0.0.1:3001/v1/observability/events?trace_id=ae8ae735-9794-480c-b445-47c02265215b',
    );
  });

  it('strips trailing slash from baseUrl', () => {
    expect(
      buildObservabilityEventsUrl({
        baseUrl: 'http://127.0.0.1:3001/',
        afterEventId: '42',
      }),
    ).toBe('http://127.0.0.1:3001/v1/observability/events?after=42');
  });
});
