import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createAgentRuntime,
  getSchemasRoot,
  resetMessageValidatorCache,
  resetValidatorCache,
} from '@oacp/core';
import type { TaskRequestMessage } from '@oacp/core';

import { createTestApp, devPublicKey } from './helpers.js';

afterEach(() => {
  resetValidatorCache();
  resetMessageValidatorCache();
});

function loadTaskRequestExample(): TaskRequestMessage {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as TaskRequestMessage;
}

describe('capability auto-routing (Day 11)', () => {
  it('POST /send-message auto-routes by capability without explicit to', async () => {
    const { app, context } = createTestApp();

    const worker = createAgentRuntime({
      identity: {
        id: 'agent://debugger',
        name: 'Debugger',
        version: '1.0',
        capabilities: ['code.debug'],
        publicKey: devPublicKey(),
      },
      bus: context.bus,
      onTask: () => ({ output: { fixed: true } }),
    });
    worker.start();

    const message = {
      ...loadTaskRequestExample(),
      message_id: crypto.randomUUID(),
      trace_id: crypto.randomUUID(),
      capability: 'code.debug',
      to: undefined,
      input: { file: 'main.ts' },
    };

    const response = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: message,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      recipients: ['agent://debugger'],
      routing: {
        mode: 'capability',
        capability: 'code.debug',
        selected_agent: 'agent://debugger',
        routing_mode: 'first',
      },
    });

    worker.stop();
  });

  it('registry-only agent is enrolled and auto-routed via prepareCapabilityRouting', async () => {
    const { app } = createTestApp();

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          id: 'agent://summarizer',
          name: 'Summarizer',
          version: '1.0',
          capabilities: ['text.summarize'],
          publicKey: devPublicKey(),
        },
      },
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
      recipients: ['agent://summarizer'],
      routing: { mode: 'capability', capability: 'text.summarize' },
    });
  });

  it('POST /agents after runtime start preserves onTask handler', async () => {
    const { app, context } = createTestApp();
    const handled: string[] = [];

    const worker = createAgentRuntime({
      identity: {
        id: 'agent://summarizer',
        name: 'Summarizer',
        version: '1.0',
        capabilities: ['text.summarize'],
        publicKey: devPublicKey(),
      },
      bus: context.bus,
      onTask: (task) => {
        const text =
          task.type === 'task_request' && typeof task.input.text === 'string'
            ? task.input.text
            : '';
        handled.push(text);
        return { output: { summary: text } };
      },
    });
    worker.start();

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          id: 'agent://summarizer',
          name: 'Summarizer',
          version: '1.0',
          capabilities: ['text.summarize'],
          publicKey: devPublicKey(),
        },
        replace: true,
      },
    });

    const message = loadTaskRequestExample();
    await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: message,
    });

    expect(handled).toEqual([message.input.text]);
    worker.stop();
  });

  it('selects lexicographically first agent when multiple match', async () => {
    const { app } = createTestApp();

    for (const id of ['agent://worker-z', 'agent://worker-a']) {
      await app.inject({
        method: 'POST',
        url: '/agents',
        payload: {
          identity: {
            id,
            name: id,
            version: '1.0',
            capabilities: ['code.debug'],
            publicKey: devPublicKey(),
          },
        },
      });
    }

    const message = {
      ...loadTaskRequestExample(),
      message_id: crypto.randomUUID(),
      trace_id: crypto.randomUUID(),
      capability: 'code.debug',
      input: {},
    };

    const response = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: message,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      recipients: ['agent://worker-a'],
      routing: { selected_agent: 'agent://worker-a' },
    });
  });
});
