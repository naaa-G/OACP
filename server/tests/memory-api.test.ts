import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { createAgentRuntime, getSchemasRoot } from '@oacp/core';

import { createTestApp, loadSummarizerIdentity } from './helpers.js';

function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}

describe('memory HTTP API (Day 15)', () => {
  const { app, context } = createTestApp();
  let baseUrl = '';
  const workerIdentity = {
    ...loadSummarizerIdentity(),
    id: 'agent://worker',
    name: 'Worker',
    capabilities: ['echo'],
  };

  const worker = createAgentRuntime({
    identity: workerIdentity,
    bus: context.bus,
    taskRecorder: context.taskRecorder,
    onTask: (task) => ({
      output: { echo: task.input.text },
    }),
  });

  worker.start();

  afterAll(async () => {
    worker.stop();
    await context.memoryStore.close();
    await app.close();
  });

  it('records task history on POST /send-message and exposes GET /memory/traces/:traceId', async () => {
    baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          ...loadSummarizerIdentity(),
          id: 'agent://coordinator',
          name: 'Coordinator',
          capabilities: ['orchestrate'],
        },
      },
    });

    const send = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        ...loadTaskRequestExample(),
        message_id: '550e8400-e29b-41d4-4716-446655440099',
        trace_id: '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c99',
        from: 'agent://coordinator',
        capability: 'echo',
        input: { text: 'persisted' },
      },
    });

    expect(send.statusCode).toBe(200);

    const trace = await app.inject({
      method: 'GET',
      url: '/memory/traces/0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c99',
    });

    expect(trace.statusCode).toBe(200);
    const body = trace.json() as { entries: Array<{ kind: string }> };
    expect(body.entries.length).toBeGreaterThanOrEqual(1);
    expect(body.entries.some((e) => e.kind === 'task_request')).toBe(true);

    const scopes = await app.inject({ method: 'GET', url: '/memory/scopes' });
    expect(scopes.statusCode).toBe(200);

    expect(baseUrl.length).toBeGreaterThan(0);
  });
});
