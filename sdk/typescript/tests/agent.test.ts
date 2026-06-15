import { describe, expect, it } from 'vitest';

import type { TaskHandler } from '@oacp/core';

import { Agent, LocalBus } from '../src/index.js';

const summarizerHandler: TaskHandler = (task) => {
  const text =
    task.type === 'task_request' && typeof task.input.text === 'string' ? task.input.text : '';
  return {
    output: { summary: `Summary of: ${text.slice(0, 40)}...` },
  };
};

describe('@oacp/sdk Agent', () => {
  it('runs the README hello-agents flow', async () => {
    const bus = new LocalBus();

    const summarizer = new Agent({
      name: 'summarizer',
      capabilities: ['text.summarize'],
      bus,
      onTask: summarizerHandler,
    });

    const coordinator = new Agent({
      name: 'coordinator',
      capabilities: ['orchestrate'],
      bus,
    });

    summarizer.start();
    coordinator.start();

    const result = await coordinator.sendTask({
      capability: 'text.summarize',
      input: { text: 'OACP lets agents collaborate over a shared protocol...' },
    });

    expect(result.status).toBe('success');
    expect(result.output?.summary).toContain('Summary of: OACP lets agents collaborate');

    summarizer.stop();
    coordinator.stop();
  });

  it('exposes agent id derived from name', () => {
    const bus = new LocalBus();
    const agent = new Agent({ name: 'worker', capabilities: ['echo'], bus });
    expect(agent.id).toBe('agent://worker');
  });
});
