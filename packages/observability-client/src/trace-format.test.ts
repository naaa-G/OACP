import { describe, expect, it } from 'vitest';

import {
  formatTraceActivityTime,
  formatTraceDuration,
  formatTraceListMeta,
  formatTraceStatusLabel,
  resolveTraceDisplayStatus,
  shortTraceId,
  traceDurationMs,
} from './trace-format.js';
import type { TraceListEntry } from './types.js';

describe('shortTraceId', () => {
  it('truncates long UUIDs', () => {
    expect(shortTraceId('0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b')).toBe('0c8f1e2a…');
  });

  it('returns short ids unchanged', () => {
    expect(shortTraceId('trace-1')).toBe('trace-1');
  });
});

describe('formatTraceListMeta', () => {
  it('formats message and agent counts with duration', () => {
    const trace: TraceListEntry = {
      traceId: 't1',
      startedAt: '2026-06-19T12:00:00.000Z',
      lastActivityAt: '2026-06-19T12:01:05.000Z',
      messageCount: 12,
      messageTypes: [],
      agents: ['a', 'b', 'c'],
    };

    expect(formatTraceListMeta(trace)).toBe('12 msgs · 3 agents · 1m 05s');
  });

  it('uses singular labels', () => {
    const trace: TraceListEntry = {
      traceId: 't1',
      startedAt: '2026-06-19T12:00:00.000Z',
      lastActivityAt: '2026-06-19T12:00:01.000Z',
      messageCount: 1,
      messageTypes: [],
      agents: ['a'],
    };

    expect(formatTraceListMeta(trace)).toBe('1 msg · 1 agent · 1s');
  });
});

describe('trace duration and status', () => {
  it('formats running trace duration from last activity', () => {
    const trace: TraceListEntry = {
      traceId: 't1',
      startedAt: '2026-06-19T12:00:00.000Z',
      lastActivityAt: '2026-06-19T12:02:30.000Z',
      messageCount: 3,
      messageTypes: [],
      agents: ['a'],
    };

    expect(traceDurationMs(trace)).toBe(150_000);
    expect(formatTraceDuration(trace)).toBe('2m 30s');
    expect(resolveTraceDisplayStatus(trace)).toBe('running');
  });

  it('prefers completed_at and explicit status', () => {
    const trace: TraceListEntry = {
      traceId: 't1',
      startedAt: '2026-06-19T12:00:00.000Z',
      lastActivityAt: '2026-06-19T12:02:30.000Z',
      completedAt: '2026-06-19T12:03:00.000Z',
      status: 'completed',
      messageCount: 3,
      messageTypes: [],
      agents: ['a'],
    };

    expect(formatTraceDuration(trace)).toBe('3m 00s');
    expect(resolveTraceDisplayStatus(trace)).toBe('completed');
    expect(formatTraceStatusLabel('completed')).toBe('Completed');
  });

  it('falls back to failed when message types include failure', () => {
    const trace: TraceListEntry = {
      traceId: 't1',
      startedAt: '2026-06-19T12:00:00.000Z',
      lastActivityAt: '2026-06-19T12:00:30.000Z',
      messageCount: 3,
      messageTypes: ['task_failed'],
      agents: ['a'],
    };

    expect(resolveTraceDisplayStatus(trace)).toBe('failed');
  });
});

describe('formatTraceActivityTime', () => {
  it('returns relative minutes for recent activity', () => {
    const now = Date.parse('2026-06-19T12:00:00.000Z');
    const label = formatTraceActivityTime('2026-06-19T11:58:00.000Z', now);
    expect(label).toMatch(/2 min/);
  });

  it('returns dash for invalid timestamps', () => {
    expect(formatTraceActivityTime('not-a-date')).toBe('—');
  });
});
