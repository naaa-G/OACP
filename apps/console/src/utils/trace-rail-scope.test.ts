import { describe, expect, it } from 'vitest';

import { filterTracesByScope, isLiveTrace } from './trace-rail-scope.js';
import type { TraceListEntry } from '@oacp/observability-client';

function trace(status: NonNullable<TraceListEntry['status']>, id = 't1'): TraceListEntry {
  return {
    traceId: id,
    startedAt: '2026-01-01T00:00:00.000Z',
    lastActivityAt: '2026-01-01T00:00:05.000Z',
    messageCount: 2,
    messageTypes: ['task_request'],
    agents: ['agent://a'],
    status,
  };
}

describe('trace-rail-scope', () => {
  it('identifies live traces', () => {
    expect(isLiveTrace(trace('running'))).toBe(true);
    expect(isLiveTrace(trace('completed'))).toBe(false);
  });

  it('filters live only scope', () => {
    const traces = [trace('running', 'live'), trace('completed', 'done')];
    expect(filterTracesByScope(traces, 'live').map((row) => row.traceId)).toEqual(['live']);
    expect(filterTracesByScope(traces, 'all')).toHaveLength(2);
  });
});
