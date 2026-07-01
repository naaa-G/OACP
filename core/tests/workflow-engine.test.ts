import { describe, expect, it } from 'vitest';

import {
  OacpWorkflowError,
  WORKFLOW_ERROR_CODES,
  WorkflowEngine,
  createAgentRuntime,
  createMessageBus,
  createWorkflowEngine,
} from '../src/index.js';

import { createCoordinatorIdentity } from './integration/helpers.js';

describe('workflow engine (Day 18)', () => {
  it('registers and lists workflow definitions', () => {
    const engine = createWorkflowEngine();
    engine.register({
      id: 'doc-pipeline',
      name: 'Document Pipeline',
      steps: [{ id: 'echo', capability: 'work.echo', input: { text: 'hi' } }],
    });

    expect(engine.listDefinitions()).toHaveLength(1);
    expect(engine.getDefinition('doc-pipeline')?.name).toBe('Document Pipeline');
  });

  it('runs a DAG workflow with parallel and dependent steps', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;
    const order: string[] = [];

    const summarizer = createAgentRuntime({
      identity: {
        id: 'agent://summarizer',
        name: 'Summarizer',
        version: '1.0',
        capabilities: ['text.summarize'],
        publicKey,
      },
      bus,
      onTask: (task) => {
        order.push('summarize');
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { summary: `Final: ${text}` } };
      },
    });

    const analyzer = createAgentRuntime({
      identity: {
        id: 'agent://analyzer',
        name: 'Analyzer',
        version: '1.0',
        capabilities: ['analyze.text'],
        publicKey,
      },
      bus,
      onTask: (task) => {
        order.push('analyze');
        const tokens = Array.isArray(task.input.tokens) ? task.input.tokens : [];
        const category = typeof task.input.category === 'string' ? task.input.category : 'general';
        return { output: { analysis: `${category}:${tokens.join('+')}` } };
      },
    });

    const tokenizer = createAgentRuntime({
      identity: {
        id: 'agent://tokenizer',
        name: 'Tokenizer',
        version: '1.0',
        capabilities: ['text.tokenize'],
        publicKey,
      },
      bus,
      onTask: (task) => {
        order.push('tokenize');
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { tokens: text.split(/\s+/) } };
      },
    });

    const classifier = createAgentRuntime({
      identity: {
        id: 'agent://classifier',
        name: 'Classifier',
        version: '1.0',
        capabilities: ['text.classify'],
        publicKey,
      },
      bus,
      onTask: (task) => {
        order.push('classify');
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { category: text.includes('revenue') ? 'finance' : 'general' } };
      },
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    summarizer.start();
    analyzer.start();
    tokenizer.start();
    classifier.start();
    coordinator.start();

    const engine = new WorkflowEngine();
    engine.register({
      id: 'research-dag',
      name: 'Research DAG',
      steps: [
        {
          id: 'tokenize',
          capability: 'text.tokenize',
          input: { text: 'revenue growth' },
        },
        {
          id: 'classify',
          capability: 'text.classify',
          input: { text: 'revenue growth' },
        },
        {
          id: 'analyze',
          capability: 'analyze.text',
          dependsOn: ['tokenize', 'classify'],
          mapInput: (ctx) => ({
            tokens: ctx.getStepResult('tokenize')?.output?.tokens ?? [],
            category: ctx.getStepResult('classify')?.output?.category ?? 'general',
          }),
        },
        {
          id: 'summarize',
          capability: 'text.summarize',
          dependsOn: ['analyze'],
          mapInput: (ctx) => {
            const analysis = ctx.getStepResult('analyze')?.output?.analysis;
            return { text: typeof analysis === 'string' ? analysis : '' };
          },
        },
      ],
      reduceOutput: (ctx) => ({
        summary: ctx.getStepResult('summarize')?.output?.summary,
      }),
    });

    const result = await engine.run('research-dag', coordinator, { topic: 'revenue growth' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.output?.summary).toBe('Final: finance:revenue+growth');
    expect(order).toContain('tokenize');
    expect(order).toContain('classify');
    expect(order.indexOf('analyze')).toBeGreaterThan(order.indexOf('tokenize'));

    const run = await engine.getRun(result.runId);
    expect(run?.status).toBe('completed');
    expect(run?.traceId).toBe(result.traceId);

    summarizer.stop();
    analyzer.stop();
    tokenizer.stop();
    classifier.stop();
    coordinator.stop();
  });

  it('throws when running an unknown workflow', async () => {
    const bus = createMessageBus();
    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });
    coordinator.start();

    const engine = createWorkflowEngine();
    await expect(engine.run('missing', coordinator, {})).rejects.toThrow(OacpWorkflowError);

    try {
      await engine.run('missing', coordinator, {});
    } catch (error) {
      expect((error as OacpWorkflowError).code).toBe(WORKFLOW_ERROR_CODES.NOT_FOUND);
    }

    coordinator.stop();
  });
});
