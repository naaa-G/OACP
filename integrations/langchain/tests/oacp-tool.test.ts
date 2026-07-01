import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApp } from '@oacp/server';
import { AgentClient, DEFAULT_DEV_PUBLIC_KEY, createAgentRuntime } from '@oacp/sdk';

import {
  OacpToolError,
  capabilityToToolName,
  createOacpTool,
  executeOacpCapabilityTask,
} from '../src/index.js';

describe('executeOacpCapabilityTask', () => {
  it('returns task output from remote worker', async () => {
    const { app, context } = createApp({ logger: false, config: { memoryBackend: 'memory' } });

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          id: 'agent://summarizer',
          name: 'Summarizer',
          version: '1.0',
          capabilities: ['text.summarize'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        replace: true,
      },
    });

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
        return { output: { summary: `LC: ${text}` } };
      },
    });
    worker.start();

    const baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });

    try {
      const client = new AgentClient({ baseUrl, timeoutMs: 10_000 });
      await client.registerAgent(
        {
          id: 'agent://lc-coordinator',
          name: 'LC Coordinator',
          version: '1.0',
          capabilities: ['orchestrate'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        { replace: true },
      );

      const output = await executeOacpCapabilityTask(client, {
        from: 'agent://lc-coordinator',
        capability: 'text.summarize',
        input: { text: 'hello adapter' },
      });

      expect(output).toEqual({ summary: 'LC: hello adapter' });
    } finally {
      worker.stop();
      await app.close();
    }
  });

  it('throws OacpToolError on task failure', async () => {
    const { app, context } = createApp({ logger: false, config: { memoryBackend: 'memory' } });

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          id: 'agent://fail-worker',
          name: 'Fail Worker',
          version: '1.0',
          capabilities: ['work.fail'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        replace: true,
      },
    });

    const worker = createAgentRuntime({
      identity: {
        id: 'agent://fail-worker',
        name: 'Fail Worker',
        version: '1.0',
        capabilities: ['work.fail'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
      bus: context.bus,
      onTask: () => ({ status: 'error', error: { code: 'DEMO_FAIL', message: 'boom' } }),
    });
    worker.start();

    const baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });

    try {
      const client = new AgentClient({ baseUrl, timeoutMs: 10_000 });
      await client.registerAgent(
        {
          id: 'agent://lc-coordinator',
          name: 'LC Coordinator',
          version: '1.0',
          capabilities: ['orchestrate'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        { replace: true },
      );

      await expect(
        executeOacpCapabilityTask(client, {
          from: 'agent://lc-coordinator',
          capability: 'work.fail',
          input: {},
        }),
      ).rejects.toBeInstanceOf(OacpToolError);
    } finally {
      worker.stop();
      await app.close();
    }
  });
});

describe('capabilityToToolName', () => {
  it('sanitizes capability strings', () => {
    expect(capabilityToToolName('text.summarize')).toBe('text_summarize');
    expect(capabilityToToolName('startup.plan')).toBe('startup_plan');
  });
});

describe('createOacpTool', () => {
  it('invokes LangChain tool against OACP worker', async () => {
    const { app, context } = createApp({ logger: false, config: { memoryBackend: 'memory' } });

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          id: 'agent://summarizer',
          name: 'Summarizer',
          version: '1.0',
          capabilities: ['text.summarize'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        replace: true,
      },
    });

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
        return { output: { summary: text.toUpperCase() } };
      },
    });
    worker.start();

    const baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });

    try {
      const client = new AgentClient({ baseUrl, timeoutMs: 10_000 });
      await client.registerAgent(
        {
          id: 'agent://lc-coordinator',
          name: 'LC Coordinator',
          version: '1.0',
          capabilities: ['orchestrate'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        { replace: true },
      );

      const lcTool = createOacpTool({
        client,
        coordinatorId: 'agent://lc-coordinator',
        capability: 'text.summarize',
        schema: z.object({ text: z.string() }),
      });

      const raw: unknown = await lcTool.invoke({ text: 'langchain bridge' });
      const parsed = JSON.parse(String(raw)) as { summary: string };
      expect(parsed.summary).toBe('LANGCHAIN BRIDGE');
    } finally {
      worker.stop();
      await app.close();
    }
  });
});
