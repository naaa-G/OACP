import { afterAll, describe, expect, it } from 'vitest';

import { createAgentRuntime, PROTOCOL_VERSION } from '@oacp/core';

import { createTestApp, devPublicKey } from './helpers.js';

describe('workflow HTTP API (Day 18)', () => {
  const { app, context } = createTestApp();

  const worker = createAgentRuntime({
    identity: {
      id: 'agent://worker',
      name: 'Worker',
      version: PROTOCOL_VERSION,
      capabilities: ['work.echo'],
      publicKey: devPublicKey(),
    },
    bus: context.bus,
    taskRecorder: context.taskRecorder,
    delegationGraphRecorder: context.delegationGraphRecorder,
    onTask: (task) => ({
      output: { value: task.input.value },
    }),
  });

  worker.start();

  context.workflowEngine.register({
    id: 'echo-workflow',
    name: 'Echo Workflow',
    steps: [
      {
        id: 'echo',
        capability: 'work.echo',
        input: { value: 'from-http' },
      },
    ],
  });

  afterAll(async () => {
    worker.stop();
    await context.memoryStore.close();
    await app.close();
  });

  it('lists registered workflows and runs via POST /workflows/:id/run', async () => {
    const list = await app.inject({ method: 'GET', url: '/workflows' });
    expect(list.statusCode).toBe(200);
    const listBody: { count: number } = list.json();
    expect(listBody.count).toBeGreaterThanOrEqual(1);

    const run = await app.inject({
      method: 'POST',
      url: '/workflows/echo-workflow/run',
      payload: { input: {} },
    });

    expect(run.statusCode).toBe(200);
    const runBody: {
      result: { ok: boolean; runId: string; output?: { value: string } };
    } = run.json();
    expect(runBody.result.ok).toBe(true);
    expect(runBody.result.output?.value).toBe('from-http');

    const record = await app.inject({
      method: 'GET',
      url: `/workflows/runs/${runBody.result.runId}`,
    });
    expect(record.statusCode).toBe(200);
    const recordBody: { run: { status: string } } = record.json();
    expect(recordBody.run.status).toBe('completed');
  });

  it('returns 404 for unknown workflow run', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/workflows/runs/00000000-0000-4000-8000-000000000000',
    });
    expect(response.statusCode).toBe(404);
  });
});
