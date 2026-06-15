import { describe, expect, it } from 'vitest';

import {
  OacpWorkflowError,
  WORKFLOW_ERROR_CODES,
  createAgentRuntime,
  createFunctionSubtaskPlanner,
  createMessageBus,
  executeSubtaskPlan,
  planExecutionBatches,
  validateSubtaskPlan,
} from '../src/index.js';

import { createCoordinatorIdentity } from './integration/helpers.js';

describe('subtask plan validation (Day 17)', () => {
  it('rejects empty plans', () => {
    expect(() => {
      validateSubtaskPlan({ steps: [] });
    }).toThrow(OacpWorkflowError);
  });

  it('rejects duplicate step ids', () => {
    expect(() => {
      validateSubtaskPlan({
        steps: [
          { id: 'a', capability: 'work.a', input: {} },
          { id: 'a', capability: 'work.b', input: {} },
        ],
      });
    }).toThrow(OacpWorkflowError);
  });

  it('rejects unknown dependencies', () => {
    expect(() => {
      validateSubtaskPlan({
        steps: [{ id: 'b', capability: 'work.b', dependsOn: ['missing'], input: {} }],
      });
    }).toThrow(OacpWorkflowError);
  });

  it('rejects dependency cycles', () => {
    try {
      validateSubtaskPlan({
        steps: [
          { id: 'a', capability: 'work.a', dependsOn: ['b'], input: {} },
          { id: 'b', capability: 'work.b', dependsOn: ['a'], input: {} },
        ],
      });
      expect.fail('expected cycle error');
    } catch (error) {
      expect(error).toBeInstanceOf(OacpWorkflowError);
      expect((error as OacpWorkflowError).code).toBe(WORKFLOW_ERROR_CODES.PLAN_CYCLE);
    }
  });

  it('groups independent steps into parallel batches', () => {
    const batches = planExecutionBatches([
      { id: 'tokenize', capability: 'text.tokenize', input: { text: 'x' } },
      { id: 'classify', capability: 'text.classify', input: { text: 'x' } },
      {
        id: 'analyze',
        capability: 'analyze.text',
        dependsOn: ['tokenize', 'classify'],
        input: {},
      },
      { id: 'summarize', capability: 'text.summarize', dependsOn: ['analyze'], input: {} },
    ]);

    expect(batches).toHaveLength(3);
    expect(batches[0]).toEqual(expect.arrayContaining(['tokenize', 'classify']));
    expect(batches[1]).toEqual(['analyze']);
    expect(batches[2]).toEqual(['summarize']);
  });
});

describe('subtask plan execution (Day 17)', () => {
  it('executes a multi-step plan with dependencies via sendSubTask', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;
    const completed: string[] = [];

    const summarizer = createAgentRuntime({
      identity: {
        id: 'agent://summarizer',
        name: 'Summarizer',
        version: '0.1',
        capabilities: ['text.summarize'],
        publicKey,
      },
      bus,
      onTask: (task) => {
        completed.push('summarize');
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { summary: `Sum: ${text}` } };
      },
    });

    const analyzer = createAgentRuntime({
      identity: {
        id: 'agent://analyzer',
        name: 'Analyzer',
        version: '0.1',
        capabilities: ['analyze.text'],
        publicKey,
      },
      bus,
      onTask: (task) => {
        completed.push('analyze');
        const tokens = Array.isArray(task.input.tokens) ? task.input.tokens : [];
        return { output: { analysis: tokens.join('-') } };
      },
    });

    const tokenizer = createAgentRuntime({
      identity: {
        id: 'agent://tokenizer',
        name: 'Tokenizer',
        version: '0.1',
        capabilities: ['text.tokenize'],
        publicKey,
      },
      bus,
      onTask: (task) => {
        completed.push('tokenize');
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { tokens: text.split(/\s+/) } };
      },
    });

    const orchestrator = createAgentRuntime({
      identity: {
        id: 'agent://orchestrator',
        name: 'Orchestrator',
        version: '0.1',
        capabilities: ['orchestrate.decompose'],
        publicKey,
      },
      bus,
      onTask: async (_task, ctx) => {
        const result = await ctx.executePlan({
          steps: [
            {
              id: 'tokenize',
              capability: 'text.tokenize',
              input: { text: 'alpha beta gamma' },
            },
            {
              id: 'analyze',
              capability: 'analyze.text',
              dependsOn: ['tokenize'],
              mapInput: (planCtx) => ({
                tokens: planCtx.getStepResult('tokenize')?.output?.tokens ?? [],
              }),
            },
            {
              id: 'summarize',
              capability: 'text.summarize',
              dependsOn: ['analyze'],
              mapInput: (planCtx) => {
                const analysis = planCtx.getStepResult('analyze')?.output?.analysis;
                return {
                  text: typeof analysis === 'string' ? analysis : '',
                };
              },
            },
          ],
          reduceOutput: (planCtx) => ({
            summary: planCtx.getStepResult('summarize')?.output?.summary,
            steps: planCtx.stepResults.size,
          }),
        });

        if (!result.ok) {
          return {
            status: 'error',
            error: {
              code: WORKFLOW_ERROR_CODES.STEP_FAILED,
              message: result.error.message,
            },
          };
        }

        return { output: result.output ?? {} };
      },
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    summarizer.start();
    analyzer.start();
    tokenizer.start();
    orchestrator.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'orchestrate.decompose',
      to: 'agent://orchestrator',
      input: { topic: 'ignored-by-static-plan' },
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(completed).toEqual(['tokenize', 'analyze', 'summarize']);
    expect(outcome.response?.output?.summary).toBe('Sum: alpha-beta-gamma');
    expect(outcome.response?.output?.steps).toBe(3);

    summarizer.stop();
    analyzer.stop();
    tokenizer.stop();
    orchestrator.stop();
    coordinator.stop();
  });

  it('executes independent steps in parallel batches', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;
    const started = new Map<string, number>();
    let clock = 0;

    const slow = (stepId: string, delayMs: number) =>
      createAgentRuntime({
        identity: {
          id: `agent://${stepId}`,
          name: stepId,
          version: '0.1',
          capabilities: [`work.${stepId}`],
          publicKey,
        },
        bus,
        onTask: async () => {
          started.set(stepId, clock++);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return { output: { stepId } };
        },
      });

    const stepA = slow('a', 40);
    const stepB = slow('b', 40);
    const stepC = slow('c', 5);

    const orchestrator = createAgentRuntime({
      identity: {
        id: 'agent://orchestrator',
        name: 'Orchestrator',
        version: '0.1',
        capabilities: ['orchestrate.parallel'],
        publicKey,
      },
      bus,
      onTask: async (_task, ctx) => {
        const result = await ctx.executePlan({
          steps: [
            { id: 'a', capability: 'work.a', input: {} },
            { id: 'b', capability: 'work.b', input: {} },
            { id: 'c', capability: 'work.c', dependsOn: ['a', 'b'], input: {} },
          ],
        });
        return {
          output: {
            ok: result.ok,
            started: Object.fromEntries(started),
          },
        };
      },
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    stepA.start();
    stepB.start();
    stepC.start();
    orchestrator.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'orchestrate.parallel',
      to: 'agent://orchestrator',
      input: {},
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    const startedOrder = outcome.response?.output?.started as Record<string, number>;
    const startA = startedOrder.a ?? -1;
    const startB = startedOrder.b ?? -1;
    const startC = startedOrder.c ?? -1;
    expect(startA).toBeGreaterThanOrEqual(0);
    expect(startB).toBeGreaterThanOrEqual(0);
    expect(startC).toBeGreaterThanOrEqual(0);
    expect(startA).toBeLessThan(startC);
    expect(startB).toBeLessThan(startC);
    expect(Math.abs(startA - startB)).toBeLessThanOrEqual(1);

    stepA.stop();
    stepB.stop();
    stepC.stop();
    orchestrator.stop();
    coordinator.stop();
  });

  it('decomposeAndExecute runs a planner-produced plan', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;

    const worker = createAgentRuntime({
      identity: {
        id: 'agent://worker',
        name: 'Worker',
        version: '0.1',
        capabilities: ['work.echo'],
        publicKey,
      },
      bus,
      onTask: (task) => ({ output: { value: task.input.value } }),
    });

    const orchestrator = createAgentRuntime({
      identity: {
        id: 'agent://orchestrator',
        name: 'Orchestrator',
        version: '0.1',
        capabilities: ['orchestrate.plan'],
        publicKey,
      },
      bus,
      onTask: async (_task, ctx) => {
        const planner = createFunctionSubtaskPlanner(({ input }) => ({
          steps: [
            {
              id: 'echo',
              capability: 'work.echo',
              input: { value: input.payload },
            },
          ],
        }));

        const result = await ctx.decomposeAndExecute({ planner });
        if (!result.ok) {
          return { status: 'error', error: { code: 'PLAN', message: 'failed' } };
        }
        return { output: result.output ?? {} };
      },
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    worker.start();
    orchestrator.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'orchestrate.plan',
      to: 'agent://orchestrator',
      input: { payload: 'planned-value' },
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.response?.output?.value).toBe('planned-value');

    worker.stop();
    orchestrator.stop();
    coordinator.stop();
  });

  it('fails fast when a step errors', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;

    const failing = createAgentRuntime({
      identity: {
        id: 'agent://failing',
        name: 'Failing',
        version: '0.1',
        capabilities: ['work.fail'],
        publicKey,
      },
      bus,
      onTask: () => ({
        status: 'error',
        error: { code: 'FAIL', message: 'boom' },
      }),
    });

    const orchestrator = createAgentRuntime({
      identity: {
        id: 'agent://orchestrator',
        name: 'Orchestrator',
        version: '0.1',
        capabilities: ['orchestrate.plan'],
        publicKey,
      },
      bus,
      onTask: async (_task, ctx) => {
        const result = await executeSubtaskPlan(
          ctx,
          {
            steps: [
              { id: 'fail', capability: 'work.fail', input: {} },
              { id: 'never', capability: 'work.fail', dependsOn: ['fail'], input: {} },
            ],
          },
          {},
        );
        return {
          output: {
            ok: result.ok,
            failedStepId: result.ok ? undefined : result.failedStepId,
            stepCount: result.steps.length,
          },
        };
      },
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    failing.start();
    orchestrator.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'orchestrate.plan',
      to: 'agent://orchestrator',
      input: {},
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.response?.output?.ok).toBe(false);
    expect(outcome.response?.output?.failedStepId).toBe('fail');
    expect(outcome.response?.output?.stepCount).toBe(1);

    failing.stop();
    orchestrator.stop();
    coordinator.stop();
  });
});
