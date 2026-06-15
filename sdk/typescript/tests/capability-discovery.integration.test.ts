import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAgentRuntime } from '@oacp/core';
import { createApp } from '@oacp/server';

import { AgentClient } from '../src/index.js';
import { DEFAULT_DEV_PUBLIC_KEY } from '../src/defaults.js';

describe('capability discovery integration (Day 10)', () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const { app, context } = createApp({ logger: false });

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          id: 'agent://summarizer',
          name: 'Summarizer',
          version: '0.1',
          capabilities: ['text.summarize'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
      },
    });

    const worker = createAgentRuntime({
      identity: {
        id: 'agent://summarizer',
        name: 'Summarizer',
        version: '0.1',
        capabilities: ['text.summarize'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
      bus: context.bus,
      onTask: (task) => {
        const text =
          task.type === 'task_request' && typeof task.input.text === 'string'
            ? task.input.text
            : '';
        return { output: { summary: `Discovered: ${text}` } };
      },
    });
    worker.start();

    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    baseUrl = address;
    closeServer = async () => {
      worker.stop();
      await app.close();
    };
  });

  afterAll(async () => {
    await closeServer();
  });

  it('findAgentsByCapability returns worker and sendTask routes via discovered id', async () => {
    const client = new AgentClient({ baseUrl, timeoutMs: 10_000 });

    await client.registerAgent({
      id: 'agent://coordinator',
      name: 'Coordinator',
      version: '0.1',
      capabilities: ['orchestrate'],
      publicKey: DEFAULT_DEV_PUBLIC_KEY,
    });

    const agents = await client.findAgentsByCapability('text.summarize');
    expect(agents.map((agent) => agent.id)).toContain('agent://summarizer');

    const target = agents.find((agent) => agent.id === 'agent://summarizer');
    expect(target).toBeDefined();
    if (!target) {
      throw new Error('Expected summarizer in discovery results');
    }

    const result = await client.sendTask({
      from: 'agent://coordinator',
      capability: 'text.summarize',
      to: target.id,
      input: { text: 'via discovery' },
      responseTimeoutMs: 10_000,
    });

    expect(result.status).toBe('success');
    expect(result.output?.summary).toBe('Discovered: via discovery');
  });

  it('listAgents with capability filter matches dedicated discovery endpoint', async () => {
    const client = new AgentClient({ baseUrl });

    const viaList = await client.listAgents({ capability: 'text.summarize', limit: 10 });
    const viaDiscover = await client.findAgentsByCapability('text.summarize', { limit: 10 });

    expect(viaList.map((agent) => agent.id)).toEqual(viaDiscover.map((agent) => agent.id));
  });
});
