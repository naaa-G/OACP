import { describe, expect, it } from 'vitest';

import {
  buildConsoleTraceUrl,
  buildTraceDeepLink,
  readAgentIdFromSearch,
  readTraceIdFromSearch,
  syncSelectionToSearch,
  TRACE_ID_QUERY_PARAM,
  writeTraceIdToSearch,
} from './trace-url.js';

describe('readTraceIdFromSearch', () => {
  it('returns undefined when param absent', () => {
    expect(readTraceIdFromSearch('')).toBeUndefined();
    expect(readTraceIdFromSearch('?mode=showcase')).toBeUndefined();
  });

  it('reads trace_id from search string', () => {
    expect(readTraceIdFromSearch('?trace_id=abc-123&mode=ops')).toBe('abc-123');
  });

  it('ignores empty trace_id values', () => {
    expect(readTraceIdFromSearch('?trace_id=')).toBeUndefined();
    expect(readTraceIdFromSearch('?trace_id=%20')).toBeUndefined();
  });
});

describe('syncSelectionToSearch', () => {
  it('sets trace_id and agent while preserving mode', () => {
    expect(
      syncSelectionToSearch('?mode=legacy', {
        traceId: 'trace-1',
        agentId: 'agent://mcplab-planner',
      }),
    ).toBe('?mode=legacy&trace_id=trace-1&agent=agent%3A%2F%2Fmcplab-planner');
  });

  it('removes agent when undefined', () => {
    expect(
      syncSelectionToSearch('?trace_id=t1&agent=agent://a&mode=ops', {
        traceId: 't1',
        agentId: undefined,
      }),
    ).toBe('?trace_id=t1&mode=ops');
  });
});

describe('readAgentIdFromSearch', () => {
  it('reads agent URI from search string', () => {
    expect(readAgentIdFromSearch('?agent=agent%3A%2F%2Fmcplab-planner&trace_id=t1')).toBe(
      'agent://mcplab-planner',
    );
  });
});

describe('writeTraceIdToSearch', () => {
  it('sets trace_id while preserving other params', () => {
    expect(writeTraceIdToSearch('?mode=showcase', 'trace-1')).toBe(
      '?mode=showcase&trace_id=trace-1',
    );
  });

  it('replaces existing trace_id', () => {
    expect(writeTraceIdToSearch('?trace_id=old&mode=ops', 'new')).toBe('?trace_id=new&mode=ops');
  });

  it('removes trace_id when undefined', () => {
    expect(writeTraceIdToSearch('?trace_id=old&mode=ops', undefined)).toBe('?mode=ops');
    expect(writeTraceIdToSearch('?trace_id=old', undefined)).toBe('');
  });
});

describe('buildTraceDeepLink', () => {
  it('builds console deep link with default showcase mode', () => {
    expect(buildTraceDeepLink('uuid-1')).toBe('/console/?trace_id=uuid-1&mode=showcase');
  });

  it('includes extra params without duplicating mode', () => {
    expect(
      buildTraceDeepLink('uuid-1', {
        extraParams: { mode: 'ops' },
      }),
    ).toBe(`/console/?mode=ops&${TRACE_ID_QUERY_PARAM}=uuid-1`);
  });
});

const DEFAULT_SHOWCASE_QUERY =
  'trace_id=uuid-1&mode=showcase&showcase_layout=force&showcase_bloom=medium';

describe('buildConsoleTraceUrl', () => {
  it('builds absolute console URL from OACP origin', () => {
    expect(buildConsoleTraceUrl('http://127.0.0.1:3001', 'uuid-1')).toBe(
      `http://127.0.0.1:3001/console/?${DEFAULT_SHOWCASE_QUERY}`,
    );
  });

  it('strips legacy /playground suffix from base', () => {
    expect(buildConsoleTraceUrl('http://127.0.0.1:3001/playground', 'uuid-1')).toBe(
      `http://127.0.0.1:3001/console/?${DEFAULT_SHOWCASE_QUERY}`,
    );
  });
});
