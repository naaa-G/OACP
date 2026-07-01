import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createAgentRuntime,
  createDelegationGraphRecorder,
  getSchemasRoot,
  PROTOCOL_VERSION,
} from '@oacp/core';

import {
  LEGACY_PLAYGROUND_SNAPSHOT_SUCCESSOR,
  LEGACY_PLAYGROUND_SNAPSHOT_SUNSET,
  loadOpenApiDocument,
} from '../src/observability/openapi.js';
import { assertValidOpenApiJsonResponse } from './openapi-validator.js';
import { createTestApp, loadSummarizerIdentity } from './helpers.js';

const repoOpenApiPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'specs',
  'openapi',
  'v1.json',
);

function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}

describe('OpenAPI v1 freeze (Day 54)', () => {
  const graphRecorder = createDelegationGraphRecorder();
  const { app, context } = createTestApp({
    context: { delegationGraphRecorder: graphRecorder },
  });

  const traceId = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c88';

  const worker = createAgentRuntime({
    identity: {
      ...loadSummarizerIdentity(),
      id: 'agent://openapi-worker',
      name: 'OpenAPI Worker',
      capabilities: ['echo'],
      metadata: { fleet: 'mcplab', role: 'coder' },
    },
    bus: context.bus,
    taskRecorder: context.taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => ({
      output: { echo: task.input.text },
    }),
  });

  worker.start();

  beforeAll(async () => {
    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          ...loadSummarizerIdentity(),
          id: 'agent://openapi-coordinator',
          name: 'OpenAPI Coordinator',
          capabilities: ['orchestrate'],
          metadata: { fleet: 'mcplab', role: 'coordinator' },
        },
      },
    });

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity: worker.identity },
    });

    const message = {
      ...loadTaskRequestExample(),
      message_id: '550e8400-e29b-41d4-4716-4466554400a1',
      trace_id: traceId,
      from: 'agent://openapi-coordinator',
      timestamp: '2026-07-01T12:00:00.000Z',
      capability: 'echo',
      input: { text: 'openapi-freeze' },
    };

    await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: message,
    });
  });

  afterAll(async () => {
    worker.stop();
    await context.memoryStore.close();
    await app.close();
  });

  it('serves GET /v1/openapi.json identical to specs/openapi/v1.json', async () => {
    const document = loadOpenApiDocument();
    expect(document.openapi).toBe('3.1.0');
    expect((document.info as { version: string }).version).toBe('1.0.0');

    const response = await app.inject({
      method: 'GET',
      url: '/v1/openapi.json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual(JSON.parse(readFileSync(repoOpenApiPath, 'utf8')));
  });

  it('validates snapshot against OpenAPI SnapshotResponse schema', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/observability/snapshot?trace_id=${traceId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    assertValidOpenApiJsonResponse('/v1/observability/snapshot', 'get', 200, body);
    expect(
      (body as { snapshot: { server: { protocol_version: string } } }).snapshot.server
        .protocol_version,
    ).toBe(PROTOCOL_VERSION);
  });

  it('validates runtime-config against OpenAPI RuntimeConfigResponse schema', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/observability/runtime-config',
    });

    expect(response.statusCode).toBe(200);
    assertValidOpenApiJsonResponse('/v1/observability/runtime-config', 'get', 200, response.json());
  });

  it('validates trace graph against OpenAPI TraceGraphResponse schema', async () => {
    const send = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        ...loadTaskRequestExample(),
        message_id: '550e8400-e29b-41d4-4716-4466554400a2',
        trace_id: traceId,
        from: 'agent://openapi-coordinator',
        timestamp: '2026-07-01T12:01:00.000Z',
        capability: 'echo',
        input: { text: 'graph-seed' },
      },
    });
    expect(send.statusCode).toBe(200);

    const response = await app.inject({
      method: 'GET',
      url: `/v1/observability/traces/${traceId}/graph`,
    });

    expect(response.statusCode).toBe(200);
    assertValidOpenApiJsonResponse(
      '/v1/observability/traces/{traceId}/graph',
      'get',
      200,
      response.json(),
    );
  });

  it('validates import against OpenAPI ImportTraceResponse schema', async () => {
    const importTraceId = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c99';
    const identity = {
      ...loadSummarizerIdentity(),
      id: 'agent://openapi-imported',
      name: 'Imported',
      capabilities: ['plan'],
    };

    const response = await app.inject({
      method: 'POST',
      url: '/v1/observability/import',
      payload: {
        trace_id: importTraceId,
        agents: [identity],
        messages: [
          {
            ...loadTaskRequestExample(),
            message_id: '550e8400-e29b-41d4-4716-4466554400b1',
            trace_id: importTraceId,
            from: identity.id,
            timestamp: '2026-07-01T12:05:00.000Z',
            capability: 'plan',
            input: { goal: 'openapi import' },
          },
        ],
        source: 'test',
      },
    });

    expect(response.statusCode).toBe(200);
    assertValidOpenApiJsonResponse('/v1/observability/import', 'post', 200, response.json());
  });

  it('emits deprecation headers on GET /playground/snapshot', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/playground/snapshot',
    });

    expect(response.statusCode).toBe(200);
    assertValidOpenApiJsonResponse('/v1/observability/snapshot', 'get', 200, response.json());
    expect(response.headers.deprecation).toBe('@1754006399');
    expect(response.headers.sunset).toBe(LEGACY_PLAYGROUND_SNAPSHOT_SUNSET);
    expect(response.headers.link).toContain(LEGACY_PLAYGROUND_SNAPSHOT_SUCCESSOR);
    expect(response.headers.link).toContain('successor-version');
  });
});
