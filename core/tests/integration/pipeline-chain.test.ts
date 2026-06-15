import { afterEach, describe, expect, it } from 'vitest';

import {
  createAgentRuntime,
  createMessageBus,
  resetMessageValidatorCache,
  resetValidatorCache,
  runPipeline,
} from '../../src/index.js';

import { assertTraceMessagesValid, createCoordinatorIdentity } from './helpers.js';

afterEach(() => {
  resetValidatorCache();
  resetMessageValidatorCache();
});

describe('multi-agent pipeline chain A → B → C (Day 13)', () => {
  it('agent chain via sendSubTask — orchestrator delegates through transformer to summarizer', async () => {
    const bus = createMessageBus();

    const agentC = createAgentRuntime({
      identity: {
        id: 'agent://summarizer',
        name: 'Summarizer',
        version: '0.1',
        capabilities: ['text.summarize'],
        publicKey: createCoordinatorIdentity().publicKey,
      },
      bus,
      onTask: (task) => {
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { summary: `Final: ${text}` } };
      },
    });

    const agentB = createAgentRuntime({
      identity: {
        id: 'agent://transformer',
        name: 'Transformer',
        version: '0.1',
        capabilities: ['text.transform'],
        publicKey: createCoordinatorIdentity().publicKey,
      },
      bus,
      onTask: async (task, ctx) => {
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        const normalized = text.trim().toUpperCase();
        const downstream = await ctx.sendSubTask({
          capability: 'text.summarize',
          input: { text: normalized },
        });
        if (!downstream.ok || !downstream.response) {
          return {
            status: 'error',
            error: { code: 'CHAIN_FAILED', message: 'Downstream summarize failed' },
          };
        }
        return {
          output: {
            transformed: normalized,
            summary: downstream.response.output?.summary,
          },
        };
      },
    });

    const agentA = createAgentRuntime({
      identity: {
        id: 'agent://orchestrator',
        name: 'Orchestrator',
        version: '0.1',
        capabilities: ['orchestrate.pipeline'],
        publicKey: createCoordinatorIdentity().publicKey,
      },
      bus,
      onTask: async (task, ctx) => {
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        const downstream = await ctx.sendSubTask({
          capability: 'text.transform',
          input: { text },
        });
        if (!downstream.ok || !downstream.response) {
          return {
            status: 'error',
            error: { code: 'CHAIN_FAILED', message: 'Downstream transform failed' },
          };
        }
        const output = downstream.response.output;
        if (!output) {
          return {
            status: 'error',
            error: { code: 'CHAIN_FAILED', message: 'Empty downstream output' },
          };
        }
        return { output };
      },
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    agentC.start();
    agentB.start();
    agentA.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'orchestrate.pipeline',
      to: 'agent://orchestrator',
      input: { text: '  pipeline chain demo  ' },
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.response?.output).toEqual({
      transformed: 'PIPELINE CHAIN DEMO',
      summary: 'Final: PIPELINE CHAIN DEMO',
    });

    const trace = assertTraceMessagesValid(bus, outcome.request.trace_id);
    expect(trace.length).toBeGreaterThanOrEqual(6);
    expect(trace.filter((m) => m.type === 'task_request').length).toBeGreaterThanOrEqual(3);
    expect(trace.filter((m) => m.type === 'task_response').length).toBeGreaterThanOrEqual(3);

    agentA.stop();
    agentB.stop();
    agentC.stop();
    coordinator.stop();
  });

  it('runPipeline executes extract → transform → summarize sequentially', async () => {
    const bus = createMessageBus();

    createAgentRuntime({
      identity: {
        id: 'agent://extractor',
        name: 'Extractor',
        version: '0.1',
        capabilities: ['text.extract'],
        publicKey: createCoordinatorIdentity().publicKey,
      },
      bus,
      onTask: (task) => {
        const raw = typeof task.input.raw === 'string' ? task.input.raw : '';
        return { output: { text: raw.replace(/^RAW:/, '').trim() } };
      },
    }).start();

    createAgentRuntime({
      identity: {
        id: 'agent://transformer',
        name: 'Transformer',
        version: '0.1',
        capabilities: ['text.transform'],
        publicKey: createCoordinatorIdentity().publicKey,
      },
      bus,
      onTask: (task) => {
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { text: text.toUpperCase() } };
      },
    }).start();

    createAgentRuntime({
      identity: {
        id: 'agent://summarizer',
        name: 'Summarizer',
        version: '0.1',
        capabilities: ['text.summarize'],
        publicKey: createCoordinatorIdentity().publicKey,
      },
      bus,
      onTask: (task) => {
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { summary: `Done: ${text}` } };
      },
    }).start();

    const executor = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });
    executor.start();

    const result = await runPipeline(
      executor,
      [
        {
          id: 'extract',
          capability: 'text.extract',
          mapInput: (ctx) => ({ raw: ctx.initialInput.raw }),
        },
        {
          id: 'transform',
          capability: 'text.transform',
          mapInput: (ctx) => ({ text: ctx.getStepResult('extract')?.output?.text }),
        },
        {
          id: 'summarize',
          capability: 'text.summarize',
          mapInput: (ctx) => ({ text: ctx.getStepResult('transform')?.output?.text }),
        },
      ],
      { raw: 'RAW: hello pipeline' },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.steps).toHaveLength(3);
    expect(result.output?.summary).toBe('Done: HELLO PIPELINE');

    const trace = assertTraceMessagesValid(bus, result.traceId);
    expect(trace.map((m) => m.type)).toEqual([
      'task_request',
      'task_response',
      'task_request',
      'task_response',
      'task_request',
      'task_response',
    ]);

    executor.stop();
  });
});
