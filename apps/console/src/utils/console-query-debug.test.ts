import { describe, expect, it } from 'vitest';

import {
  getLastQueryFetchCause,
  noteQueryFetchCause,
  resolveQueryFetchCause,
} from './console-query-debug.js';

describe('console-query-debug', () => {
  it('resolves a noted fetch cause before falling back', () => {
    noteQueryFetchCause('oacp-snapshot', 'sse.debouncedResync', 'sse-bridge', {
      delayMs: 1500,
    });

    const resolved = resolveQueryFetchCause('oacp-snapshot', {
      cause: 'poll.interval',
      source: 'react-query',
    });

    expect(resolved.cause).toBe('sse.debouncedResync');
    expect(resolved.source).toBe('sse-bridge');
    expect(getLastQueryFetchCause('oacp-snapshot')?.cause).toBe('sse.debouncedResync');
  });

  it('falls back when no cause was noted', () => {
    const resolved = resolveQueryFetchCause('oacp-trace-graph', {
      cause: 'poll.interval',
      source: 'react-query',
    });

    expect(resolved.cause).toBe('poll.interval');
    expect(resolved.source).toBe('react-query');
  });
});
