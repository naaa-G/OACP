import { describe, expect, it } from 'vitest';

import {
  createFunctionSubtaskPlanner,
  type SubtaskPlanExecutionResult,
  type TaskHandler,
} from '@oacp/core';

import { Agent, LocalBus } from '../src/index.js';

describe('subtask decomposition integration (Day 17)', () => {
  it('SDK Agent executes a planner-produced subtask plan', async () => {
    const bus = new LocalBus();

    const worker = new Agent({
      name: 'worker',
      capabilities: ['work.echo'],
      bus,
      onTask: (task) => ({
        output: { value: task.input.value },
      }),
    });

    const orchestratorOnTask: TaskHandler = async (task, ctx) => {
      const payload = task.input.payload;
      const planner = createFunctionSubtaskPlanner(() => ({
        steps: [
          {
            id: 'echo',
            capability: 'work.echo',
            input: { value: payload },
          },
        ],
      }));

      const result: SubtaskPlanExecutionResult = await ctx.decomposeAndExecute({ planner });
      if (!result.ok) {
        return {
          status: 'error',
          error: { code: 'WORKFLOW_FAILED', message: result.error.message },
        };
      }
      return { output: result.output ?? {} };
    };

    const orchestrator = new Agent({
      name: 'orchestrator',
      id: 'agent://orchestrator',
      capabilities: ['orchestrate.plan'],
      bus,
      onTask: orchestratorOnTask,
    });

    const coordinator = new Agent({
      name: 'coordinator',
      capabilities: ['orchestrate'],
      bus,
    });

    worker.start();
    orchestrator.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'orchestrate.plan',
      to: 'agent://orchestrator',
      input: { payload: 'sdk-workflow' },
    });

    expect(outcome.status).toBe('success');
    expect(outcome.output?.value).toBe('sdk-workflow');

    worker.stop();
    orchestrator.stop();
    coordinator.stop();
  });
});
