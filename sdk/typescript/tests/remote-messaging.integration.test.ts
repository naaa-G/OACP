import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAgentRuntime } from '@oacp/core';

import { AgentClient } from '../src/index.js';
import { DEFAULT_DEV_PUBLIC_KEY } from '../src/defaults.js';
import { createSdkTestApp } from './test-server.js';

describe('remote messaging integration (Day 9)', () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const { app, context } = createSdkTestApp();

    const worker = createAgentRuntime({
      identity: {
        id: 'agent://summarizer',
        name: 'Summarizer',
        version: '1.0',
        capabilities: ['text.summarize'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
      bus: context.bus,
      onTask: (task) => {
        const text =
          task.type === 'task_request' && typeof task.input.text === 'string'
            ? task.input.text
            : '';
        return { output: { summary: `Remote: ${text}` } };
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

  it('AgentClient.sendTask over HTTP — remote coordinator, local worker on server', async () => {
    const client = new AgentClient({ baseUrl, timeoutMs: 10_000 });

    await client.registerAgent({
      id: 'agent://coordinator',
      name: 'Coordinator',
      version: '1.0',
      capabilities: ['orchestrate'],
      publicKey: DEFAULT_DEV_PUBLIC_KEY,
    });

    const result = await client.sendTask({
      from: 'agent://coordinator',
      capability: 'text.summarize',
      input: { text: 'networked agents' },
      responseTimeoutMs: 10_000,
    });

    expect(result.status).toBe('success');
    expect(result.output?.summary).toBe('Remote: networked agents');
    expect(result.response?.from).toBe('agent://summarizer');
    expect(result.response?.in_reply_to).toBe(result.request.message_id);
  });

  it('AgentClient.send delivers fire-and-forget messages', async () => {
    const client = new AgentClient({ baseUrl });

    const sendResult = await client.send({
      type: 'task_request',
      version: '1.0',
      message_id: crypto.randomUUID(),
      trace_id: crypto.randomUUID(),
      from: 'agent://coordinator',
      timestamp: new Date().toISOString(),
      capability: 'text.summarize',
      input: { text: 'fire and forget' },
    });

    expect(sendResult.ok).toBe(true);
    expect(sendResult.recipients).toContain('agent://summarizer');
  });

  it('AgentClient.getAgent retrieves registered identity', async () => {
    const client = new AgentClient({ baseUrl });
    const agent = await client.getAgent('coordinator');
    expect(agent.id).toBe('agent://coordinator');
  });
});
