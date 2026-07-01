import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { getSchemasRoot, resetMessageValidatorCache, resetValidatorCache } from '@oacp/core';

import { SERVER_ERROR_CODES } from '../src/errors.js';
import { createTestApp, loadSummarizerIdentity } from './helpers.js';

afterEach(() => {
  resetValidatorCache();
  resetMessageValidatorCache();
});

function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}

describe('HTTP reference server (Day 8)', () => {
  it('GET / redirects browsers to the Console', async () => {
    const { app } = createTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: { accept: 'text/html,application/xhtml+xml' },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/console/');
  });

  it('GET / returns a JSON service index for API clients', async () => {
    const { app } = createTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: { accept: 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: 'oacp-reference-server',
      ui: { console: '/console', playground: '/playground', trace_viewer: '/trace-viewer' },
      api: { health: '/health', send_message: '/send-message' },
    });
  });

  it('GET /health returns node status', async () => {
    const { app } = createTestApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      status: 'healthy',
      bus_open: true,
    });
  });

  it('POST /agents registers an agent and GET /agent/:id retrieves it', async () => {
    const { app } = createTestApp();
    const identity = loadSummarizerIdentity();

    const register = await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity },
    });
    expect(register.statusCode).toBe(200);

    const lookup = await app.inject({
      method: 'GET',
      url: '/agent/summarizer',
    });
    expect(lookup.statusCode).toBe(200);
    expect(lookup.json()).toMatchObject({
      ok: true,
      agent: { id: 'agent://summarizer' },
    });
  });

  it('GET /agent/:id returns 404 for unknown agents', async () => {
    const { app } = createTestApp();
    const response = await app.inject({ method: 'GET', url: '/agent/unknown' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: { code: SERVER_ERROR_CODES.AGENT_NOT_FOUND },
    });
  });

  it('POST /send-message validates and routes to a registered agent', async () => {
    const { app } = createTestApp();
    const identity = loadSummarizerIdentity();

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity },
    });

    const message = loadTaskRequestExample();
    const response = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: message,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      message_id: message.message_id,
      recipients: ['agent://summarizer'],
    });
  });

  it('POST /send-message rejects invalid payloads with 400', async () => {
    const { app } = createTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: { type: 'task_request', version: '1.0' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: SERVER_ERROR_CODES.VALIDATION_FAILED },
    });
  });

  it('POST /send-message returns 404 when no recipient matches', async () => {
    const { app } = createTestApp();
    const message = {
      ...loadTaskRequestExample(),
      capability: 'nonexistent.capability',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: message,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: { code: SERVER_ERROR_CODES.ROUTING_FAILED },
    });
  });

  it('GET /agent/:id/messages returns 204 when mailbox is empty', async () => {
    const { app } = createTestApp();
    const identity = loadSummarizerIdentity();

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/agent/summarizer/messages?timeoutMs=50',
    });

    expect(response.statusCode).toBe(204);
  });

  it('GET /capabilities/:capability/agents discovers agents by capability (Day 10)', async () => {
    const { app } = createTestApp();
    const identity = loadSummarizerIdentity();

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/capabilities/text.summarize/agents',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      capability: 'text.summarize',
      count: 1,
      agents: [{ id: 'agent://summarizer' }],
    });
  });

  it('GET /capabilities/:capability/agents returns empty list when no matches', async () => {
    const { app } = createTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/capabilities/code.debug/agents',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      capability: 'code.debug',
      count: 0,
      agents: [],
    });
  });

  it('GET /capabilities/:capability/agents rejects invalid capability ids', async () => {
    const { app } = createTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/capabilities/INVALID/agents',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: SERVER_ERROR_CODES.VALIDATION_FAILED },
    });
  });

  it('GET /agents?capability= filters by capability (Day 10)', async () => {
    const { app } = createTestApp();
    const identity = loadSummarizerIdentity();

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/agents?capability=text.summarize&limit=5',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      capability: 'text.summarize',
      count: 1,
      agents: [{ id: 'agent://summarizer' }],
    });
  });

  it('GET /agents lists registered agents', async () => {
    const { app } = createTestApp();
    const identity = loadSummarizerIdentity();

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity },
    });

    const response = await app.inject({ method: 'GET', url: '/agents' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      agents: [{ id: 'agent://summarizer' }],
    });
  });
});
