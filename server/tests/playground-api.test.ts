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

describe('playground HTTP API (Day 22)', () => {
  const graphRecorder = createDelegationGraphRecorder();
  const { app, context } = createTestApp({
    context: { delegationGraphRecorder: graphRecorder },
  });

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

  it('redirects GET /playground to /console with query passthrough (Day 7)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/playground?trace_id=trace-1',
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/console/?trace_id=trace-1');
  });

  it('returns unified snapshot via GET /playground/snapshot', async () => {
    await app.listen({ host: '127.0.0.1', port: 0 });
    const traceId = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c22';

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: worker.identity,
      },
    });

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
        message_id: '550e8400-e29b-41d4-4716-4466554400f0',
        trace_id: traceId,
        from: 'agent://coordinator',
        capability: 'echo',
        input: { text: 'playground-test' },
      },
    });

    expect(send.statusCode).toBe(200);

    const snapshotResponse = await app.inject({
      method: 'GET',
      url: `/playground/snapshot?trace_id=${traceId}`,
    });

    expect(snapshotResponse.statusCode).toBe(200);
    const body = snapshotResponse.json<{
      snapshot: {
        agents: Array<{ id: string }>;
        traces: Array<{ traceId: string }>;
        active_trace?: { trace_id: string; message_count: number };
        agent_links: unknown[];
      };
    }>();

    expect(body.snapshot.agents.length).toBeGreaterThanOrEqual(2);
    expect(body.snapshot.traces.some((trace) => trace.traceId === traceId)).toBe(true);
    expect(body.snapshot.active_trace?.trace_id).toBe(traceId);
    expect(body.snapshot.active_trace?.message_count).toBeGreaterThanOrEqual(1);
  });
});
