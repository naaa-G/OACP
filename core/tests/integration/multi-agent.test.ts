import { afterEach, describe, expect, it } from 'vitest';

import {
  PROTOCOL_VERSION,
  createAgentRuntime,
  createMessageBus,
  resetMessageValidatorCache,
  resetValidatorCache,
} from '../../src/index.js';
import type { InMemoryMessageBus } from '../../src/index.js';

import {
  assertTaskCorrelation,
  assertTraceMessagesValid,
  createCoordinatorIdentity,
  loadSummarizerIdentity,
} from './helpers.js';

afterEach(() => {
  resetValidatorCache();
  resetMessageValidatorCache();
});

describe('Week 1 milestone — multi-agent integration (Day 7)', () => {
  it('Agent A sends task_request → Agent B responds with task_response (capability routing)', async () => {
    const bus = createMessageBus();
    const worker = createAgentRuntime({
      identity: loadSummarizerIdentity(),
      bus,
      onTask: (request) => {
        const text = typeof request.input.text === 'string' ? request.input.text : '';
        return { output: { summary: `Summary: ${text}` } };
      },
    });
    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    worker.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'text.summarize',
      input: { text: 'Multi-agent communication works.' },
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.response?.status).toBe('success');
    expect(outcome.response?.output?.summary).toBe('Summary: Multi-agent communication works.');
    expect(outcome.request.from).toBe('agent://coordinator');
    expect(outcome.request.version).toBe(PROTOCOL_VERSION);

    if (outcome.response) {
      assertTaskCorrelation(
        outcome.request.message_id,
        outcome.response,
        outcome.request.trace_id,
        'agent://summarizer',
      );
    }

    const traceMessages = assertTraceMessagesValid(bus, outcome.request.trace_id);
    expect(traceMessages.map((m) => m.type)).toEqual(['task_request', 'task_response']);

    worker.stop();
    coordinator.stop();
  });

  it('routes via direct `to` when coordinator targets a specific agent', async () => {
    const bus = createMessageBus();
    const worker = createAgentRuntime({
      identity: loadSummarizerIdentity(),
      bus,
      onTask: () => ({ output: { routed: 'direct' } }),
    });
    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    worker.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'text.summarize',
      to: 'agent://summarizer',
      input: { text: 'direct route' },
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.request.to).toBe('agent://summarizer');
      expect(outcome.response?.output?.routed).toBe('direct');
    }

    worker.stop();
    coordinator.stop();
  });

  it('supports manual receiveTask + respond between two agents', async () => {
    const bus = createMessageBus();
    const worker = createAgentRuntime({
      identity: loadSummarizerIdentity(),
      bus,
      autoHandleTasks: false,
      useMailbox: true,
    });
    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    worker.start();
    coordinator.start();

    const receivePromise = worker.receiveTask(5_000);
    const sendPromise = coordinator.sendTask({
      capability: 'text.summarize',
      input: { text: 'manual integration' },
    });

    const task = await receivePromise;
    expect(task?.type).toBe('task_request');

    if (task) {
      const respondOutcome = await worker.respond(task, {
        output: { summary: 'manual response' },
      });
      expect(respondOutcome.ok).toBe(true);
    }

    const outcome = await sendPromise;
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.response?.output?.summary).toBe('manual response');
    }

    worker.stop();
    coordinator.stop();
  });

  it('propagates structured worker errors back to the coordinator', async () => {
    const bus = createMessageBus();
    const worker = createAgentRuntime({
      identity: loadSummarizerIdentity(),
      bus,
      onTask: () => ({
        status: 'error',
        error: { code: 'TASK_REJECTED', message: 'Input too short' },
      }),
    });
    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    worker.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'text.summarize',
      input: { text: 'x' },
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.response?.status).toBe('error');
      expect(outcome.response?.error?.code).toBe('TASK_REJECTED');
    }

    worker.stop();
    coordinator.stop();
  });

  it('records a complete observable trace on the shared bus', async () => {
    const bus = createMessageBus();
    const worker = createAgentRuntime({
      identity: loadSummarizerIdentity(),
      bus,
      onTask: () => ({ output: { ok: true } }),
    });
    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    worker.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'text.summarize',
      input: { text: 'trace me' },
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    const trace = bus.getTrace(outcome.request.trace_id);
    expect(trace?.messageCount).toBe(2);
    expect(bus.getMessageById(outcome.request.message_id)?.type).toBe('task_request');
    if (outcome.response) {
      expect(bus.getMessageById(outcome.response.message_id)?.type).toBe('task_response');
    }

    worker.stop();
    coordinator.stop();
  });
});

describe('integration harness sanity', () => {
  it('creates an isolated bus per scenario', () => {
    const busA: InMemoryMessageBus = createMessageBus();
    const busB: InMemoryMessageBus = createMessageBus();
    expect(busA).not.toBe(busB);
    expect(busA.getStats().registeredAgents).toBe(0);
  });
});
