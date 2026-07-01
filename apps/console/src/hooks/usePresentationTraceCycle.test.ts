import { describe, expect, it } from 'vitest';

import type { TraceListEntry } from '@oacp/observability-client';

import { resolveNextPresentationTraceId } from './usePresentationTraceCycle.js';

const traces: readonly TraceListEntry[] = [
  {
    traceId: 'trace-a',
    startedAt: '2026-06-20T00:00:00.000Z',
    lastActivityAt: '2026-06-20T00:00:10.000Z',
    messageCount: 2,
    messageTypes: ['task_request'],
    agents: ['agent://a'],
  },
  {
    traceId: 'trace-b',
    startedAt: '2026-06-20T00:01:00.000Z',
    lastActivityAt: '2026-06-20T00:01:20.000Z',
    messageCount: 3,
    messageTypes: ['task_request'],
    agents: ['agent://b'],
  },
];

describe('resolveNextPresentationTraceId', () => {
  it('returns the next trace id in rotation', () => {
    expect(resolveNextPresentationTraceId(traces, 'trace-a')).toBe('trace-b');
    expect(resolveNextPresentationTraceId(traces, 'trace-b')).toBe('trace-a');
  });

  it('returns undefined when fewer than two traces exist', () => {
    expect(resolveNextPresentationTraceId(traces.slice(0, 1), 'trace-a')).toBeUndefined();
  });
});
