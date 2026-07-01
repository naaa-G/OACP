import { describe, expect, it } from 'vitest';

import {
  buildConsoleTraceUrl,
  buildPlaygroundTraceUrl,
  DEFAULT_CONSOLE_GRAPH_MODE,
} from '../src/mcplab/trace-url.js';

describe('buildConsoleTraceUrl', () => {
  it('builds showcase deep link with trace_id and mode', () => {
    const url = buildConsoleTraceUrl('http://127.0.0.1:3001', 'trace-abc');
    expect(url).toBe('http://127.0.0.1:3001/console/?trace_id=trace-abc&mode=showcase');
  });

  it('strips /playground and /console suffixes from base URL', () => {
    expect(buildConsoleTraceUrl('http://127.0.0.1:3001/playground', 't1')).toBe(
      'http://127.0.0.1:3001/console/?trace_id=t1&mode=showcase',
    );
    expect(buildConsoleTraceUrl('http://127.0.0.1:5173/console', 't1')).toBe(
      'http://127.0.0.1:5173/console/?trace_id=t1&mode=showcase',
    );
  });

  it('supports custom graph mode', () => {
    const url = buildConsoleTraceUrl('http://127.0.0.1:3001', 't1', { mode: 'legacy' });
    expect(url).toContain('mode=legacy');
  });

  it('defaults to showcase mode constant', () => {
    expect(DEFAULT_CONSOLE_GRAPH_MODE).toBe('showcase');
  });
});

describe('buildPlaygroundTraceUrl', () => {
  it('returns Console URL (deprecated alias)', () => {
    expect(buildPlaygroundTraceUrl('http://127.0.0.1:3001', 't1')).toBe(
      buildConsoleTraceUrl('http://127.0.0.1:3001', 't1'),
    );
  });
});
