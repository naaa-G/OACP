import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAgentRuntime } from '@oacp/core';
import { createApp } from '@oacp/server';

import { AgentClient } from '../src/index.js';
import { DEFAULT_DEV_PUBLIC_KEY } from '../src/defaults.js';

describe('remote auto-routing integration (Day 11)', () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const { app, context } = createApp({ logger: false });

    const worker = createAgentRuntime({
      identity: {
        id: 'agent://debugger',
        name: 'Code Debugger',
        version: '1.0',
        capabilities: ['code.debug'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
      bus: context.bus,
      onTask: (task) => {
        const file =
          task.type === 'task_request' && typeof task.input.file === 'string'
            ? task.input.file
            : 'unknown';
        return { output: { diagnosis: `Checked ${file}` } };
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

  it('sendTask without to auto-routes by capability over HTTP', async () => {
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
      capability: 'code.debug',
      input: { file: 'app.ts' },
      responseTimeoutMs: 10_000,
    });

    expect(result.status).toBe('success');
    expect(result.output?.diagnosis).toBe('Checked app.ts');
    expect(result.response?.from).toBe('agent://debugger');
  });

  it('send returns routing metadata for capability auto-route', async () => {
    const client = new AgentClient({ baseUrl });

    const sendResult = await client.send({
      type: 'task_request',
      version: '1.0',
      message_id: crypto.randomUUID(),
      trace_id: crypto.randomUUID(),
      from: 'agent://coordinator',
      timestamp: new Date().toISOString(),
      capability: 'code.debug',
      input: { file: 'routes.ts' },
    });

    expect(sendResult.routing).toMatchObject({
      mode: 'capability',
      capability: 'code.debug',
      selected_agent: 'agent://debugger',
    });
  });
});
