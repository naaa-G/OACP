import { request as httpRequest } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { createAgentRuntime, createDelegationGraphRecorder, getSchemasRoot } from '@oacp/core';

import { createTestApp, loadSummarizerIdentity } from './helpers.js';

const STREAM_TRACE_ID = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0d46';
const REPLAY_TRACE_ID = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0d47';

function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}

async function openSseConnection(
  port: number,
  path: string,
  headers: Record<string, string> = {},
): Promise<{
  readonly chunks: () => string;
  readonly close: () => void;
  readonly wait: (ms: number) => Promise<void>;
}> {
  let chunks = '';

  const clientReq = httpRequest(
    {
      hostname: '127.0.0.1',
      port,
      path,
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...headers,
      },
    },
    (response) => {
      response.on('data', (chunk) => {
        chunks += chunk.toString();
      });
    },
  );

  await new Promise<void>((resolve, reject) => {
    clientReq.on('response', () => {
      resolve();
    });
    clientReq.on('error', reject);
    clientReq.end();
  });

  return {
    chunks: () => chunks,
    close: () => {
      clientReq.destroy();
    },
    wait: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

describe('observability SSE HTTP API (Day 46)', () => {
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

  let port = 0;

  afterAll(async () => {
    worker.stop();
    await app.close();
  });

  async function ensureListening(): Promise<number> {
    if (port > 0) {
      return port;
    }

    await app.ready();
    await new Promise<void>((resolve) => {
      app.server.listen(0, '127.0.0.1', () => {
        const address = app.server.address();
        port = typeof address === 'object' && address !== null ? address.port : 0;
        resolve();
      });
    });

    return port;
  }

  async function seedAgents(): Promise<void> {
    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity: worker.identity },
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
  }

  it('send-message publishes observability events on the shared bus', async () => {
    await ensureListening();
    await seedAgents();

    const send = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        ...loadTaskRequestExample(),
        message_id: '550e8400-e29b-41d4-4716-4466554400c1',
        trace_id: STREAM_TRACE_ID,
        from: 'agent://coordinator',
        capability: 'echo',
        input: { text: 'bus-test' },
      },
    });

    expect(send.statusCode).toBe(200);

    const events = context.observabilityEventBus.replay(undefined, { traceId: STREAM_TRACE_ID });
    expect(events.map((event) => event.type)).toContain('trace.started');
    expect(events.map((event) => event.type)).toContain('message.appended');
  });

  it('streams message.appended events when messages are sent', async () => {
    const listenPort = await ensureListening();
    await seedAgents();

    const stream = await openSseConnection(
      listenPort,
      `/v1/observability/events?trace_id=${encodeURIComponent(STREAM_TRACE_ID)}`,
    );
    await stream.wait(100);

    await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        ...loadTaskRequestExample(),
        message_id: '550e8400-e29b-41d4-4716-4466554400a1',
        trace_id: STREAM_TRACE_ID,
        from: 'agent://coordinator',
        capability: 'echo',
        input: { text: 'sse-test' },
      },
    });

    await stream.wait(500);
    const chunks = stream.chunks();
    stream.close();

    expect(chunks).toContain('event: message.appended');
    expect(chunks).toContain(STREAM_TRACE_ID);
  });

  it('replays only events after Last-Event-ID on reconnect', async () => {
    const listenPort = await ensureListening();
    await seedAgents();

    await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        ...loadTaskRequestExample(),
        message_id: '550e8400-e29b-41d4-4716-4466554400b1',
        trace_id: REPLAY_TRACE_ID,
        from: 'agent://coordinator',
        capability: 'echo',
        input: { text: 'first-message' },
      },
    });

    const buffered = context.observabilityEventBus.replay(undefined, { traceId: REPLAY_TRACE_ID });
    const lastEventId = buffered.at(-1)?.id;
    expect(lastEventId).toBeDefined();

    const stream = await openSseConnection(
      listenPort,
      `/v1/observability/events?trace_id=${encodeURIComponent(REPLAY_TRACE_ID)}`,
      { 'Last-Event-ID': lastEventId ?? '' },
    );
    await stream.wait(200);
    const chunks = stream.chunks();
    stream.close();

    expect(chunks).not.toContain('first-message');
    expect(chunks).not.toContain('event: trace.started');
  });

  it('advertises the SSE endpoint in API discovery', async () => {
    await ensureListening();
    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: { accept: 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.api.observability_events).toBe('/v1/observability/events');
  });
});
