import { describe, expect, it, vi } from 'vitest';

import { fetchSnapshot } from './client.js';
import { ObservabilityClientError } from './errors.js';
import { snapshotStats } from './types.js';

describe('fetchSnapshot', () => {
  it('fetches and parses a successful snapshot response', async () => {
    const snapshot = {
      server: {
        status: 'healthy' as const,
        protocol_version: '1.0',
        registered_agents: 2,
        bus_open: true,
      },
      agents: [],
      traces: [],
      trace_count: 0,
      agent_links: [],
    };

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, snapshot }),
    });

    const result = await fetchSnapshot({
      baseUrl: 'http://localhost:3000',
      fetchImpl,
    });

    expect(result).toEqual(snapshot);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3000/v1/observability/snapshot?limit=25',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('includes trace_id query param when provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        snapshot: {
          server: {
            status: 'healthy',
            protocol_version: '1.0',
            registered_agents: 0,
            bus_open: true,
          },
          agents: [],
          traces: [],
          trace_count: 0,
          agent_links: [],
        },
      }),
    });

    await fetchSnapshot({
      traceId: 'trace-abc',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      '/v1/observability/snapshot?limit=25&trace_id=trace-abc',
      expect.any(Object),
    );
  });

  it('throws ObservabilityClientError on HTTP error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, error: { message: 'boom' } }),
    });

    await expect(fetchSnapshot({ fetchImpl })).rejects.toBeInstanceOf(ObservabilityClientError);
  });

  it('treats non-JSON gateway responses as unreachable', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    });

    await expect(fetchSnapshot({ fetchImpl })).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('unreachable'),
    });
  });

  it('treats 502 gateway responses as unreachable', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    await expect(fetchSnapshot({ fetchImpl })).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('unreachable'),
    });
  });

  it('falls back to legacy playground snapshot when v1 returns 404', async () => {
    const snapshot = {
      server: {
        status: 'healthy' as const,
        protocol_version: '1.0',
        registered_agents: 1,
        bus_open: true,
      },
      agents: [],
      traces: [],
      trace_count: 0,
      agent_links: [],
    };

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          message: 'Route GET:/v1/observability/snapshot not found',
          error: 'Not Found',
          statusCode: 404,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, snapshot }),
      });

    const result = await fetchSnapshot({
      baseUrl: 'http://127.0.0.1:3001',
      fetchImpl,
    });

    expect(result).toEqual(snapshot);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'http://127.0.0.1:3001/v1/observability/snapshot?limit=25',
    );
    expect(fetchImpl.mock.calls[1]?.[0]).toBe('http://127.0.0.1:3001/playground/snapshot?limit=25');

    // Subsequent calls use cached legacy path (single request).
    fetchImpl.mockClear();
    fetchImpl.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, snapshot }),
    });

    await fetchSnapshot({
      baseUrl: 'http://127.0.0.1:3001',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://127.0.0.1:3001/playground/snapshot?limit=25');
  });
});

describe('snapshotStats', () => {
  it('derives counts from snapshot', () => {
    const stats = snapshotStats({
      server: {
        status: 'healthy',
        protocol_version: '1.0',
        registered_agents: 5,
        bus_open: true,
      },
      agents: [],
      traces: [],
      trace_count: 3,
      active_trace: {
        trace_id: 't1',
        started_at: '',
        last_activity_at: '',
        message_count: 12,
        message_types: [],
        agents: [],
        timeline: [],
      },
      agent_links: [],
    });

    expect(stats).toEqual({
      agentCount: 5,
      traceCount: 3,
      messageCount: 12,
    });
  });
});
