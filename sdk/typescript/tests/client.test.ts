import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION } from '@oacp/core';

import { AgentClient, CLIENT_ERROR_CODES, OacpClientError } from '../src/index.js';

describe('AgentClient', () => {
  it('GET /health via injectable fetch', async () => {
    const client = new AgentClient({
      baseUrl: 'http://test.local',
      fetchFn: (url, init) => {
        expect(url).toBe('http://test.local/health');
        expect(init?.method).toBe('GET');
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: true,
              status: 'healthy',
              protocol_version: PROTOCOL_VERSION,
              registered_agents: 0,
              bus_open: true,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      },
    });

    const health = await client.health();
    expect(health.protocol_version).toBe('0.1');
    expect(health.bus_open).toBe(true);
  });

  it('POST /send-message sends JSON body', async () => {
    let capturedBody: unknown;
    const client = new AgentClient({
      baseUrl: 'http://test.local',
      fetchFn: (_url, init) => {
        const raw = init?.body;
        capturedBody = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: true,
              message_id: 'msg-1',
              trace_id: 'trace-1',
              type: 'task_request',
              recipients: ['agent://worker'],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      },
    });

    const result = await client.send({
      type: 'task_request',
      version: '0.1',
      message_id: 'msg-1',
      trace_id: 'trace-1',
      from: 'agent://coordinator',
      timestamp: new Date().toISOString(),
      capability: 'echo',
      input: { text: 'hi' },
    });

    expect(result.recipients).toContain('agent://worker');
    expect(capturedBody).toMatchObject({ type: 'task_request' });
  });

  it('maps 404 server errors to OacpClientError', async () => {
    const client = new AgentClient({
      baseUrl: 'http://test.local',
      fetchFn: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: { code: 'SERVER_AGENT_NOT_FOUND', message: 'not found' },
            }),
            { status: 404, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
    });

    await expect(client.getAgent('missing')).rejects.toMatchObject({
      code: CLIENT_ERROR_CODES.AGENT_NOT_FOUND,
    });
  });

  it('GET /capabilities/:capability/agents discovers agents (Day 10)', async () => {
    const client = new AgentClient({
      baseUrl: 'http://test.local',
      fetchFn: (url, init) => {
        expect(url).toBe('http://test.local/capabilities/text.summarize/agents?limit=3');
        expect(init?.method).toBe('GET');
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: true,
              capability: 'text.summarize',
              count: 1,
              agents: [{ id: 'agent://summarizer', capabilities: ['text.summarize'] }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      },
    });

    const agents = await client.findAgentsByCapability('text.summarize', { limit: 3 });
    expect(agents).toHaveLength(1);
    expect(agents[0]?.id).toBe('agent://summarizer');
  });

  it('throws TIMEOUT on abort', async () => {
    const client = new AgentClient({
      baseUrl: 'http://test.local',
      timeoutMs: 50,
      retryPolicy: false,
      fetchFn: (_url, init) => {
        const signal = init?.signal;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      },
    });

    const outcome = client.health();
    await expect(outcome).rejects.toBeInstanceOf(OacpClientError);
    await expect(outcome).rejects.toMatchObject({
      code: CLIENT_ERROR_CODES.TIMEOUT,
    });
  });
});
