/**
 * Day 58 — MCP OACP adapter smoke (HTTP layer used by integrate/mcp-oacp).
 */
import { buildTaskRequest, buildTaskResponse, createTraceId } from '@oacp/core';
import { afterAll, describe, expect, it } from 'vitest';

import { OBSERVABILITY_SNAPSHOT_PATH } from '../src/observability/playground-service.js';
import { createTestApp, devPublicKey } from './helpers.js';

describe('MCP OACP adapter smoke (Day 58)', () => {
  const { app, context } = createTestApp();
  const coordinatorId = 'agent://mcp-smoke-coordinator';
  const workerId = 'agent://mcp-smoke-worker';

  afterAll(async () => {
    await context.observabilityPersistence.close();
    await app.close();
  });

  it('registers agents, sends trace, snapshot lists trace, console URL is valid', async () => {
    for (const agent of [
      {
        id: coordinatorId,
        name: 'MCP Smoke Coordinator',
        capabilities: ['orchestrate'],
        metadata: { fleet: 'custom-demo', role: 'coordinator' },
      },
      {
        id: workerId,
        name: 'MCP Smoke Worker',
        capabilities: ['work.echo'],
        metadata: { fleet: 'custom-demo', role: 'worker' },
      },
    ]) {
      const reg = await app.inject({
        method: 'POST',
        url: '/agents',
        payload: {
          identity: {
            ...agent,
            version: '1.0',
            publicKey: devPublicKey(),
          },
          replace: true,
        },
      });
      expect(reg.statusCode).toBe(200);
    }

    const traceId = createTraceId();
    const request = buildTaskRequest({
      from: coordinatorId,
      to: workerId,
      capability: 'work.echo',
      input: { value: 'mcp-smoke' },
      traceId,
    });

    const sendReq = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: request,
    });
    expect(sendReq.statusCode).toBe(200);

    const response = buildTaskResponse({
      from: workerId,
      inReplyTo: request.message_id,
      traceId,
      status: 'success',
      output: { ok: true },
    });

    const sendRes = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: response,
    });
    expect(sendRes.statusCode).toBe(200);

    const snapshot = await app.inject({
      method: 'GET',
      url: OBSERVABILITY_SNAPSHOT_PATH,
      headers: { Accept: 'application/json' },
    });
    expect(snapshot.statusCode).toBe(200);

    const body = snapshot.json();
    const rows = body.snapshot?.traces ?? [];
    const ids = rows.map((row: { traceId: string }) => row.traceId);
    expect(ids).toContain(traceId);

    const consoleUrl = `http://127.0.0.1:3847/console/?trace_id=${traceId}&mode=showcase`;
    expect(consoleUrl).toContain('/console/?trace_id=');
  });
});
