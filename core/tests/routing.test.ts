import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ROUTING_ERROR_CODES,
  VALIDATION_ERROR_CODES,
  createMessageBus,
  getSchemasRoot,
  resetMessageValidatorCache,
  resetValidatorCache,
} from '../src/index.js';
import type { OacpMessage, TaskRequestMessage, TaskResponseMessage } from '../src/index.js';

afterEach(() => {
  resetValidatorCache();
  resetMessageValidatorCache();
});

function loadExample(name: string): OacpMessage {
  return JSON.parse(readFileSync(join(getSchemasRoot(), 'examples', name), 'utf8')) as OacpMessage;
}

describe('message bus (Day 5)', () => {
  it('delivers task_request to a direct recipient', async () => {
    const bus = createMessageBus();
    const received: OacpMessage[] = [];

    bus.register('agent://summarizer', (message) => {
      received.push(message);
    });

    const request = {
      ...loadExample('task_request.example.json'),
      to: 'agent://summarizer',
    } as TaskRequestMessage;

    const outcome = await bus.send(request);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.recipients).toEqual(['agent://summarizer']);
      expect(received).toHaveLength(1);
      expect(received[0]?.message_id).toBe(request.message_id);
    }
  });

  it('picks the lexicographically first agent for capability routing (Day 11)', async () => {
    const bus = createMessageBus();
    const received: string[] = [];

    bus.register(
      'agent://summarizer-z',
      (message) => {
        received.push(message.from);
      },
      { capabilities: ['text.summarize'] },
    );
    bus.register(
      'agent://summarizer-a',
      (message) => {
        received.push(message.from);
      },
      { capabilities: ['text.summarize'] },
    );

    const request = loadExample('task_request.example.json') as TaskRequestMessage;
    const outcome = await bus.send(request);

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.recipients).toEqual(['agent://summarizer-a']);
    }
    expect(received).toHaveLength(1);
  });

  it('merges bus registration without removing an existing handler (Day 11)', async () => {
    const bus = createMessageBus();
    const handled: OacpMessage[] = [];

    bus.register(
      'agent://worker',
      (message) => {
        handled.push(message);
      },
      { capabilities: ['code.debug'] },
    );

    bus.register('agent://worker', undefined, {
      capabilities: ['code.debug'],
      useMailbox: true,
    });

    const request = {
      ...(loadExample('task_request.example.json') as TaskRequestMessage),
      capability: 'code.debug',
    };

    await bus.send(request);
    expect(handled).toHaveLength(1);
  });

  it('routes task_request by capability when to is omitted', async () => {
    const bus = createMessageBus();
    const received: OacpMessage[] = [];

    bus.register(
      'agent://summarizer',
      (message) => {
        received.push(message);
      },
      { capabilities: ['text.summarize'] },
    );

    const request = loadExample('task_request.example.json') as TaskRequestMessage;
    const outcome = await bus.send(request);

    expect(outcome.ok).toBe(true);
    expect(received).toHaveLength(1);
    expect((received[0] as TaskRequestMessage).capability).toBe('text.summarize');
  });

  it('routes task_response back to the original sender via in_reply_to', async () => {
    const bus = createMessageBus();
    const coordinatorInbox: OacpMessage[] = [];
    const workerInbox: OacpMessage[] = [];

    bus.register('agent://coordinator', (message) => {
      coordinatorInbox.push(message);
    });
    bus.register(
      'agent://summarizer',
      (message) => {
        workerInbox.push(message);
      },
      { capabilities: ['text.summarize'] },
    );

    const request = loadExample('task_request.example.json') as TaskRequestMessage;
    await bus.send(request);

    const response = loadExample('task_response.success.example.json') as TaskResponseMessage;
    const outcome = await bus.send(response);

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.recipients).toEqual(['agent://coordinator']);
    }
    expect(coordinatorInbox).toHaveLength(1);
    expect(coordinatorInbox[0]?.type).toBe('task_response');
    expect(workerInbox).toHaveLength(1);
  });

  it('tracks messages by trace_id across a conversation', async () => {
    const bus = createMessageBus();
    const traceId = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b';

    bus.register('agent://summarizer', () => {}, { capabilities: ['text.summarize'] });
    bus.register('agent://coordinator', () => {});

    const request = loadExample('task_request.example.json') as TaskRequestMessage;
    const response = loadExample('task_response.success.example.json') as TaskResponseMessage;

    await bus.send(request);
    await bus.send(response);

    const trace = bus.getTrace(traceId);
    expect(trace?.messageCount).toBe(2);
    expect(trace?.messages.map((m) => m.type)).toEqual(['task_request', 'task_response']);
    expect(bus.getMessagesForTrace(traceId)).toHaveLength(2);
  });

  it('rejects invalid messages on send', async () => {
    const bus = createMessageBus();
    bus.register('agent://summarizer', () => {});

    const outcome = await bus.sendRaw({ type: 'task_request', version: '1.0' });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe(VALIDATION_ERROR_CODES.SCHEMA_VALIDATION_FAILED);
    }
  });

  it('returns NO_RECIPIENT when capability is unknown', async () => {
    const bus = createMessageBus();
    const request = {
      ...loadExample('task_request.example.json'),
      capability: 'unknown.capability',
    } as TaskRequestMessage;

    const outcome = await bus.send(request);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe(ROUTING_ERROR_CODES.NO_RECIPIENT);
    }
  });

  it('returns AGENT_NOT_REGISTERED for unknown direct recipient', async () => {
    const bus = createMessageBus();
    const request = {
      ...loadExample('task_request.example.json'),
      to: 'agent://missing',
    } as TaskRequestMessage;

    const outcome = await bus.send(request);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe(ROUTING_ERROR_CODES.AGENT_NOT_REGISTERED);
    }
  });

  it('supports pull-based receive via mailbox', async () => {
    const bus = createMessageBus();
    bus.register('agent://summarizer', undefined, {
      capabilities: ['text.summarize'],
      useMailbox: true,
    });

    const request = loadExample('task_request.example.json') as TaskRequestMessage;
    const sendPromise = bus.send(request);
    const receivePromise = bus.waitForMessage('agent://summarizer', 2_000);

    const [outcome, message] = await Promise.all([sendPromise, receivePromise]);
    expect(outcome.ok).toBe(true);
    expect(message?.message_id).toBe(request.message_id);
  });

  it('delivers capability_query to registry agent', async () => {
    const bus = createMessageBus();
    const queries: OacpMessage[] = [];

    bus.register('agent://registry', (message) => {
      queries.push(message);
    });
    bus.register('agent://summarizer', () => {}, { capabilities: ['text.summarize'] });

    const query = loadExample('capability_query.example.json');
    const outcome = await bus.send(query);

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.recipients).toEqual(['agent://registry']);
    }
    expect(queries).toHaveLength(1);
    expect(bus.findAgentsByCapability('text.summarize')).toEqual(['agent://summarizer']);
  });

  it('reports handler failures as DELIVERY_FAILED', async () => {
    const bus = createMessageBus();
    bus.register(
      'agent://summarizer',
      () => {
        throw new Error('handler boom');
      },
      { capabilities: ['text.summarize'] },
    );

    const request = loadExample('task_request.example.json') as TaskRequestMessage;
    const outcome = await bus.send(request);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe(ROUTING_ERROR_CODES.DELIVERY_FAILED);
    }
  });

  it('stops routing after bus is closed', async () => {
    const bus = createMessageBus();
    bus.register('agent://summarizer', () => {}, { capabilities: ['text.summarize'] });
    bus.close();

    const request = loadExample('task_request.example.json') as TaskRequestMessage;
    const outcome = await bus.send(request);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe(ROUTING_ERROR_CODES.BUS_CLOSED);
    }
  });

  it('exposes bus stats for observability', () => {
    const bus = createMessageBus();
    bus.register('agent://summarizer', vi.fn(), { capabilities: ['text.summarize'] });

    const stats = bus.getStats();
    expect(stats.registeredAgents).toBe(1);
    expect(stats.capabilityCount).toBe(1);
    expect(stats.deliveryGuarantee).toBe('at-most-once');
    expect(stats.isOpen).toBe(true);
  });
});
