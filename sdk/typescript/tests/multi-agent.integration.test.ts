import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION, validateMessage } from '@oacp/core';
import type { TaskHandler } from '@oacp/core';

import { Agent, LocalBus } from '../src/index.js';

const summarizerOnTask: TaskHandler = (task) => {
  if (task.type !== 'task_request') {
    return { status: 'error', error: { code: 'UNSUPPORTED', message: 'Expected task_request' } };
  }
  const text = typeof task.input.text === 'string' ? task.input.text : '';
  return {
    output: {
      summary: text.length > 0 ? `Summary: ${text}` : 'Empty input',
    },
  };
};

/**
 * Week 1 milestone — SDK-level end-to-end multi-agent flow.
 * Agent A (coordinator) delegates to Agent B (summarizer) over a shared LocalBus.
 */
describe('Week 1 milestone — SDK multi-agent integration (Day 7)', () => {
  it('Agent A sends task → Agent B responds in one process', async () => {
    const bus = new LocalBus();

    const agentB = new Agent({
      name: 'summarizer',
      capabilities: ['text.summarize'],
      bus,
      onTask: summarizerOnTask,
    });

    const agentA = new Agent({
      name: 'coordinator',
      capabilities: ['orchestrate'],
      bus,
    });

    agentB.start();
    agentA.start();

    const result = await agentA.sendTask({
      capability: 'text.summarize',
      input: { text: 'OACP Week 1 milestone: first multi-agent communication.' },
    });

    expect(result.status).toBe('success');
    expect(result.output?.summary).toContain('OACP Week 1 milestone');
    expect(result.request.from).toBe('agent://coordinator');
    expect(result.request.version).toBe(PROTOCOL_VERSION);
    expect(result.response?.from).toBe('agent://summarizer');
    expect(result.response?.in_reply_to).toBe(result.request.message_id);
    expect(result.response?.trace_id).toBe(result.request.trace_id);

    const requestValidation = validateMessage(result.request);
    const responseValidation = validateMessage(result.response);
    expect(requestValidation.valid).toBe(true);
    expect(responseValidation.valid).toBe(true);

    const trace = bus.getTrace(result.request.trace_id);
    expect(trace?.messageCount).toBe(2);

    agentB.stop();
    agentA.stop();
  });

  it('isolates agents on separate buses (negative control)', async () => {
    const busA = new LocalBus();
    const busB = new LocalBus();

    const worker = new Agent({
      name: 'summarizer',
      capabilities: ['text.summarize'],
      bus: busB,
      onTask: summarizerOnTask,
    });
    const coordinator = new Agent({
      name: 'coordinator',
      capabilities: ['orchestrate'],
      bus: busA,
    });

    worker.start();
    coordinator.start();

    await expect(
      coordinator.sendTask({
        capability: 'text.summarize',
        input: { text: 'should fail' },
        timeoutMs: 200,
      }),
    ).rejects.toThrow();

    worker.stop();
    coordinator.stop();
  });
});
