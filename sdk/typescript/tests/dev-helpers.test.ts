import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION } from '@oacp/core';

import { DEFAULT_DEV_PUBLIC_KEY } from '../src/defaults.js';
import { createAgentClient } from '../src/client/agent-client.js';
import { registerDevAgent } from '../src/client/dev-helpers.js';

describe('createAgentClient', () => {
  it('creates AgentClient with normalized base URL', () => {
    const client = createAgentClient('http://127.0.0.1:3000/');
    expect(client.serverUrl).toBe('http://127.0.0.1:3000');
  });

  it('forwards options to AgentClient', () => {
    const client = createAgentClient('http://test.local', { timeoutMs: 5_000, retryPolicy: false });
    expect(client.serverUrl).toBe('http://test.local');
    expect(client.deliveryGuarantee).toBe('at-most-once');
  });
});

describe('registerDevAgent', () => {
  it('registers agent with development public key', async () => {
    let capturedBody: unknown;
    const client = createAgentClient('http://test.local', {
      fetchFn: (_url, init) => {
        const raw = init?.body;
        capturedBody = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: true,
              agent: {
                id: 'agent://coordinator',
                name: 'Coordinator',
                version: PROTOCOL_VERSION,
                capabilities: ['orchestrate'],
                publicKey: DEFAULT_DEV_PUBLIC_KEY,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      },
    });

    const agent = await registerDevAgent(client, {
      id: 'agent://coordinator',
      name: 'Coordinator',
      capabilities: ['orchestrate'],
      description: 'Demo coordinator',
    });

    expect(agent.id).toBe('agent://coordinator');
    expect(capturedBody).toMatchObject({
      identity: {
        id: 'agent://coordinator',
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
        version: PROTOCOL_VERSION,
        capabilities: ['orchestrate'],
        description: 'Demo coordinator',
      },
      replace: true,
    });
  });

  it('allows replace: false to override the default', async () => {
    let capturedBody: unknown;
    const client = createAgentClient('http://test.local', {
      fetchFn: (_url, init) => {
        const raw = init?.body;
        capturedBody = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: true,
              agent: { id: 'agent://coordinator', capabilities: ['orchestrate'] },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      },
    });

    await registerDevAgent(
      client,
      { id: 'agent://coordinator', name: 'Coordinator', capabilities: ['orchestrate'] },
      { replace: false },
    );

    expect(capturedBody).toMatchObject({ replace: false });
  });
});
