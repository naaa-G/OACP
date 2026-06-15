import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { createAgentRuntime, createDelegationGraphRecorder, getSchemasRoot } from '@oacp/core';

import { createTestApp, loadSummarizerIdentity } from './helpers.js';

function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}

describe('delegation graph HTTP API (Day 16)', () => {
  const graphRecorder = createDelegationGraphRecorder();
  const { app, context } = createTestApp({
    context: { delegationGraphRecorder: graphRecorder },
  });
  let baseUrl = '';

  const worker = createAgentRuntime({
    identity: {
      ...loadSummarizerIdentity(),
      id: 'agent://worker',
      name: 'Worker',
      capabilities: ['echo'],
    },
    bus: context.bus,
    taskRecorder: context.taskRecorder,
    delegationGraphRecorder: graphRecorder,
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

  it('exposes GET /graph/traces/:traceId after message flow', async () => {
    baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });

    const traceId = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0d16';

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
        message_id: '550e8400-e29b-41d4-4716-4466554400d6',
        trace_id: traceId,
        from: 'agent://coordinator',
        capability: 'echo',
        input: { text: 'graph-test' },
      },
    });

    expect(send.statusCode).toBe(200);

    const graphResponse = await app.inject({
      method: 'GET',
      url: `/graph/traces/${traceId}`,
    });

    expect(graphResponse.statusCode).toBe(200);
    const body: { graph: { trace_id: string; nodes: unknown[] } } = graphResponse.json();
    expect(body.graph.trace_id).toBe(traceId);
    expect(body.graph.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 for unknown trace graph', async () => {
    if (!baseUrl) {
      baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
    }

    const response = await app.inject({
      method: 'GET',
      url: '/graph/traces/00000000-0000-4000-8000-000000000000',
    });

    expect(response.statusCode).toBe(404);
  });
});
