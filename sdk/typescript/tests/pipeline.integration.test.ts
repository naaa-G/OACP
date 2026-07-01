import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAgentRuntime } from '@oacp/core';
import { createApp } from '@oacp/server';

import { AgentClient } from '../src/index.js';
import { DEFAULT_DEV_PUBLIC_KEY } from '../src/defaults.js';

describe('remote pipeline chain integration (Day 13)', () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const { app, context } = createApp({ logger: false });

    const summarizer = createAgentRuntime({
      identity: {
        id: 'agent://summarizer',
        name: 'Summarizer',
        version: '1.0',
        capabilities: ['text.summarize'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
      bus: context.bus,
      onTask: (task) => {
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { summary: `Remote: ${text}` } };
      },
    });

    const transformer = createAgentRuntime({
      identity: {
        id: 'agent://transformer',
        name: 'Transformer',
        version: '1.0',
        capabilities: ['text.transform'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
      bus: context.bus,
      onTask: async (task, ctx) => {
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        const sub = await ctx.sendSubTask({
          capability: 'text.summarize',
          input: { text: text.toUpperCase() },
        });
        if (!sub.ok || !sub.response) {
          return { status: 'error', error: { code: 'CHAIN', message: 'subtask failed' } };
        }
        return {
          output: { transformed: text.toUpperCase(), summary: sub.response.output?.summary },
        };
      },
    });

    const orchestrator = createAgentRuntime({
      identity: {
        id: 'agent://orchestrator',
        name: 'Orchestrator',
        version: '1.0',
        capabilities: ['orchestrate.pipeline'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
      bus: context.bus,
      onTask: async (task, ctx) => {
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        const sub = await ctx.sendSubTask({
          capability: 'text.transform',
          input: { text },
        });
        if (!sub.ok || !sub.response) {
          return { status: 'error', error: { code: 'CHAIN', message: 'subtask failed' } };
        }
        const output = sub.response.output;
        if (!output) {
          return { status: 'error', error: { code: 'CHAIN', message: 'empty downstream output' } };
        }
        return { output };
      },
    });

    summarizer.start();
    transformer.start();
    orchestrator.start();

    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    baseUrl = address;
    closeServer = async () => {
      orchestrator.stop();
      transformer.stop();
      summarizer.stop();
      await app.close();
    };
  });

  afterAll(async () => {
    await closeServer();
  });

  it('remote A → B → C chain over HTTP with shared trace_id', async () => {
    const client = new AgentClient({ baseUrl, timeoutMs: 15_000 });

    await client.registerAgent({
      id: 'agent://coordinator',
      name: 'Coordinator',
      version: '1.0',
      capabilities: ['orchestrate'],
      publicKey: DEFAULT_DEV_PUBLIC_KEY,
    });

    const result = await client.sendTask({
      from: 'agent://coordinator',
      capability: 'orchestrate.pipeline',
      to: 'agent://orchestrator',
      input: { text: 'network pipeline' },
      responseTimeoutMs: 15_000,
    });

    expect(result.status).toBe('success');
    expect(result.output).toEqual({
      transformed: 'NETWORK PIPELINE',
      summary: 'Remote: NETWORK PIPELINE',
    });
    expect(result.response?.from).toBe('agent://orchestrator');
  });
});
