import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  OacpRuntimeError,
  RUNTIME_ERROR_CODES,
  createAgentRuntime,
  createMessageBus,
  getSchemasRoot,
  parseAgentIdentity,
  resetMessageValidatorCache,
  resetValidatorCache,
} from '../src/index.js';
import type { AgentIdentity } from '../src/index.js';

afterEach(() => {
  resetValidatorCache();
  resetMessageValidatorCache();
});

function loadIdentityExample(): AgentIdentity {
  const raw = JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'agent-identity.example.json'), 'utf8'),
  ) as unknown;
  return parseAgentIdentity(raw);
}

function coordinatorIdentity(): AgentIdentity {
  return {
    ...loadIdentityExample(),
    id: 'agent://coordinator',
    name: 'Coordinator',
    capabilities: ['orchestrate'],
  };
}

describe('agent runtime (Day 6)', () => {
  it('starts and stops with lifecycle enforcement', () => {
    const bus = createMessageBus();
    const agent = createAgentRuntime({ identity: loadIdentityExample(), bus });

    expect(agent.lifecycleState).toBe('created');
    agent.start();
    expect(agent.isRunning).toBe(true);

    agent.stop();
    expect(agent.lifecycleState).toBe('stopped');
  });

  it('rejects double start', () => {
    const bus = createMessageBus();
    const agent = createAgentRuntime({ identity: loadIdentityExample(), bus });
    agent.start();

    expect(() => {
      agent.start();
    }).toThrow(OacpRuntimeError);

    agent.stop();
  });

  it('auto-handles tasks and returns task_response via sendTask', async () => {
    const bus = createMessageBus();
    const worker = createAgentRuntime({
      identity: loadIdentityExample(),
      bus,
      onTask: (request) => {
        const text = typeof request.input.text === 'string' ? request.input.text : '';
        return { output: { summary: `handled:${text}` } };
      },
    });
    const coordinator = createAgentRuntime({ identity: coordinatorIdentity(), bus });

    worker.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'text.summarize',
      input: { text: 'OACP agents collaborate' },
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.response?.status).toBe('success');
      expect(outcome.response?.output?.summary).toBe('handled:OACP agents collaborate');
      expect(outcome.request.trace_id).toBe(outcome.response?.trace_id);
    }

    worker.stop();
    coordinator.stop();
  });

  it('supports manual receiveTask and respond', async () => {
    const bus = createMessageBus();
    const worker = createAgentRuntime({
      identity: loadIdentityExample(),
      bus,
      autoHandleTasks: false,
      useMailbox: true,
    });
    const coordinator = createAgentRuntime({ identity: coordinatorIdentity(), bus });

    worker.start();
    coordinator.start();

    const receivePromise = worker.receiveTask(5_000);
    const sendPromise = coordinator.sendTask({
      capability: 'text.summarize',
      input: { text: 'manual path' },
    });

    const task = await receivePromise;
    expect(task?.type).toBe('task_request');
    if (task?.type === 'task_request') {
      await worker.respond(task, { output: { summary: 'manual ok' } });
    }

    const outcome = await sendPromise;
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.response?.output?.summary).toBe('manual ok');
    }

    worker.stop();
    coordinator.stop();
  });

  it('respond() sends a correlated task_response', async () => {
    const bus = createMessageBus();
    const responses: string[] = [];

    const worker = createAgentRuntime({
      identity: loadIdentityExample(),
      bus,
      autoHandleTasks: false,
      useMailbox: true,
    });
    bus.register('agent://coordinator', (message) => {
      if (message.type === 'task_response') {
        responses.push(message.in_reply_to);
      }
    });

    worker.start();

    const task = {
      type: 'task_request' as const,
      version: '0.1',
      message_id: crypto.randomUUID(),
      trace_id: crypto.randomUUID(),
      from: 'agent://coordinator',
      timestamp: new Date().toISOString(),
      capability: 'text.summarize',
      input: { text: 'x' },
      to: 'agent://summarizer',
    };

    await bus.send(task);
    const received = await worker.receiveTask(2_000);
    expect(received?.message_id).toBe(task.message_id);

    if (received) {
      const outcome = await worker.respond(received, { output: { ok: true } });
      expect(outcome.ok).toBe(true);
    }

    expect(responses).toContain(task.message_id);
    worker.stop();
  });

  it('rejects sendTask when agent is not started', async () => {
    const bus = createMessageBus();
    const agent = createAgentRuntime({ identity: coordinatorIdentity(), bus });

    await expect(
      agent.sendTask({ capability: 'text.summarize', input: { text: 'x' } }),
    ).rejects.toMatchObject({ code: RUNTIME_ERROR_CODES.NOT_STARTED });
  });

  it('times out when no task_response arrives', async () => {
    const bus = createMessageBus();
    const worker = createAgentRuntime({
      identity: loadIdentityExample(),
      bus,
      autoHandleTasks: false,
      useMailbox: true,
    });
    const coordinator = createAgentRuntime({ identity: coordinatorIdentity(), bus });

    worker.start();
    coordinator.start();

    const receivePromise = worker.receiveTask(5_000);
    const sendPromise = coordinator.sendTask({
      capability: 'text.summarize',
      input: { text: 'no response' },
      timeoutMs: 150,
    });

    const [task, outcome] = await Promise.all([receivePromise, sendPromise]);
    expect(task?.type).toBe('task_request');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe(RUNTIME_ERROR_CODES.RESPONSE_TIMEOUT);
    }

    worker.stop();
    coordinator.stop();
  });

  it('recovers from onTask handler failures with structured error response', async () => {
    const bus = createMessageBus();
    const worker = createAgentRuntime({
      identity: loadIdentityExample(),
      bus,
      onTask: () => {
        throw new Error('boom');
      },
    });
    const coordinator = createAgentRuntime({ identity: coordinatorIdentity(), bus });

    worker.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'text.summarize',
      input: { text: 'fail' },
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.response?.status).toBe('error');
      expect(outcome.response?.error?.code).toBe(RUNTIME_ERROR_CODES.TASK_HANDLER_FAILED);
    }

    worker.stop();
    coordinator.stop();
  });
});
