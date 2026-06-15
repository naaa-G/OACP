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

describe('trace observability HTTP API (Day 20)', () => {
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

  it('lists and resolves traces via GET /traces and GET /traces/:traceId', async () => {
    baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
    const traceId = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0d20';

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
        message_id: '550e8400-e29b-41d4-4716-4466554400e0',
        trace_id: traceId,
        from: 'agent://coordinator',
        capability: 'echo',
        input: { text: 'trace-viewer-test' },
      },
    });

    expect(send.statusCode).toBe(200);

    const listResponse = await app.inject({ method: 'GET', url: '/traces?limit=10' });
    expect(listResponse.statusCode).toBe(200);
    const listBody = listResponse.json<{ traces: Array<{ traceId: string }>; total: number }>();
    expect(listBody.total).toBeGreaterThanOrEqual(1);
    expect(listBody.traces.some((trace) => trace.traceId === traceId)).toBe(true);

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/traces/${traceId}`,
    });

    expect(detailResponse.statusCode).toBe(200);
    const detailBody = detailResponse.json<{
      trace: { trace_id: string; timeline: unknown[]; message_count: number };
    }>();
    expect(detailBody.trace.trace_id).toBe(traceId);
    expect(detailBody.trace.message_count).toBeGreaterThanOrEqual(1);
    expect(detailBody.trace.timeline.length).toBeGreaterThanOrEqual(1);
  });

  it('serves the web trace viewer at GET /trace-viewer', async () => {
    if (!baseUrl) {
      baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
    }

    const response = await app.inject({ method: 'GET', url: '/trace-viewer' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('OACP Trace Viewer');
  });

  it('returns 404 for unknown trace detail', async () => {
    if (!baseUrl) {
      baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
    }

    const response = await app.inject({
      method: 'GET',
      url: '/traces/00000000-0000-4000-8000-000000000020',
    });

    expect(response.statusCode).toBe(404);
  });
});
