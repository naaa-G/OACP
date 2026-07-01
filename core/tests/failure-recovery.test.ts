import { describe, expect, it, vi } from 'vitest';

import {
  RUNTIME_ERROR_CODES,
  WorkflowEngine,
  createAgentRuntime,
  createMessageBus,
  executeSubtaskPlan,
  sendTaskWithRecovery,
} from '../src/index.js';

import { createCoordinatorIdentity } from './integration/helpers.js';

describe('failure recovery (Day 19)', () => {
  it('failovers to the next agent when the primary returns a task error', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;

    const primary = createAgentRuntime({
      identity: {
        id: 'agent://summarizer-01-primary',
        name: 'Primary Summarizer',
        version: '1.0',
        capabilities: ['text.summarize'],
        publicKey,
      },
      bus,
      onTask: () => ({
        status: 'error',
        error: { code: 'SUMMARIZER_DOWN', message: 'Primary unavailable' },
      }),
    });

    const backup = createAgentRuntime({
      identity: {
        id: 'agent://summarizer-02-backup',
        name: 'Backup Summarizer',
        version: '1.0',
        capabilities: ['text.summarize'],
        publicKey,
      },
      bus,
      onTask: (task) => ({
        output: {
          summary: `Backup: ${typeof task.input.text === 'string' ? task.input.text : ''}`,
        },
      }),
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    primary.start();
    backup.start();
    coordinator.start();

    const outcome = await sendTaskWithRecovery(coordinator, {
      capability: 'text.summarize',
      input: { text: 'quarterly report' },
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.selectedAgent).toBe('agent://summarizer-02-backup');
    expect(outcome.recoveryAttempts).toHaveLength(2);
    expect(outcome.recoveryAttempts[0]?.outcome).toBe('task_error');
    expect(outcome.recoveryAttempts[1]?.outcome).toBe('success');
    expect((outcome.response?.output as { summary?: string } | undefined)?.summary).toBe(
      'Backup: quarterly report',
    );

    primary.stop();
    backup.stop();
    coordinator.stop();
  });

  it('tries fallback capabilities when the primary capability pool is exhausted', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;

    const premium = createAgentRuntime({
      identity: {
        id: 'agent://premium',
        name: 'Premium',
        version: '1.0',
        capabilities: ['text.summarize.premium'],
        publicKey,
      },
      bus,
      onTask: () => ({
        status: 'error',
        error: { code: 'PREMIUM_UNAVAILABLE', message: 'Premium tier down' },
      }),
    });

    const standard = createAgentRuntime({
      identity: {
        id: 'agent://standard',
        name: 'Standard',
        version: '1.0',
        capabilities: ['text.summarize.standard'],
        publicKey,
      },
      bus,
      onTask: (task) => ({
        output: { summary: `Standard: ${String(task.input.text)}` },
      }),
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    premium.start();
    standard.start();
    coordinator.start();

    const outcome = await sendTaskWithRecovery(
      coordinator,
      {
        capability: 'text.summarize.premium',
        input: { text: 'incident report' },
      },
      {
        policy: {
          fallbackCapabilities: ['text.summarize.standard'],
        },
      },
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.selectedCapability).toBe('text.summarize.standard');
    expect(outcome.selectedAgent).toBe('agent://standard');

    premium.stop();
    standard.stop();
    coordinator.stop();
  });

  it('returns RECOVERY_EXHAUSTED when all candidates fail', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;
    const sleepFn = vi.fn(() => Promise.resolve());

    const workerA = createAgentRuntime({
      identity: {
        id: 'agent://a',
        name: 'A',
        version: '1.0',
        capabilities: ['work.echo'],
        publicKey,
      },
      bus,
      onTask: () => ({
        status: 'error',
        error: { code: 'FAIL', message: 'A failed' },
      }),
    });

    const workerB = createAgentRuntime({
      identity: {
        id: 'agent://b',
        name: 'B',
        version: '1.0',
        capabilities: ['work.echo'],
        publicKey,
      },
      bus,
      onTask: () => ({
        status: 'error',
        error: { code: 'FAIL', message: 'B failed' },
      }),
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    workerA.start();
    workerB.start();
    coordinator.start();

    const outcome = await sendTaskWithRecovery(
      coordinator,
      { capability: 'work.echo', input: { value: 'x' } },
      { sleepFn },
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      return;
    }

    expect(outcome.error.code).toBe(RUNTIME_ERROR_CODES.RECOVERY_EXHAUSTED);
    expect(outcome.recoveryAttempts.length).toBeGreaterThanOrEqual(2);

    workerA.stop();
    workerB.stop();
    coordinator.stop();
  });

  it('runs a workflow step with recovery through WorkflowEngine', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;

    createAgentRuntime({
      identity: {
        id: 'agent://summarizer-01-primary',
        name: 'Primary',
        version: '1.0',
        capabilities: ['text.summarize'],
        publicKey,
      },
      bus,
      onTask: () => ({
        status: 'error',
        error: { code: 'DOWN', message: 'down' },
      }),
    }).start();

    createAgentRuntime({
      identity: {
        id: 'agent://summarizer-02-backup',
        name: 'Backup',
        version: '1.0',
        capabilities: ['text.summarize'],
        publicKey,
      },
      bus,
      onTask: (task) => ({
        output: { summary: `OK: ${String(task.input.text)}` },
      }),
    }).start();

    const coordinator = createAgentRuntime({
      identity: {
        ...createCoordinatorIdentity(),
        capabilities: ['orchestrate.workflow'],
      },
      bus,
    });
    coordinator.start();

    const engine = new WorkflowEngine();
    engine.register({
      id: 'resilient-summary',
      name: 'Resilient Summary',
      steps: [
        {
          id: 'summarize',
          capability: 'text.summarize',
          input: { text: 'workflow recovery demo' },
        },
      ],
    });

    const result = await engine.run(
      'resilient-summary',
      coordinator,
      {},
      {
        recovery: { excludeFailedAgents: true },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.output?.summary).toBe('OK: workflow recovery demo');
    const step = result.steps[0];
    expect(step?.recoveryAttempts?.length).toBe(2);
    expect(step?.from).toBe('agent://summarizer-02-backup');

    coordinator.stop();
  });

  it('executes subtask plans with recovery inside an orchestrator handler', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;

    createAgentRuntime({
      identity: {
        id: 'agent://worker-01-primary',
        name: 'Primary Worker',
        version: '1.0',
        capabilities: ['work.process'],
        publicKey,
      },
      bus,
      onTask: () => ({
        status: 'error',
        error: { code: 'WORKER_DOWN', message: 'primary down' },
      }),
    }).start();

    createAgentRuntime({
      identity: {
        id: 'agent://worker-02-backup',
        name: 'Backup Worker',
        version: '1.0',
        capabilities: ['work.process'],
        publicKey,
      },
      bus,
      onTask: (task) => ({
        output: { processed: task.input.payload },
      }),
    }).start();

    const orchestrator = createAgentRuntime({
      identity: {
        id: 'agent://orchestrator',
        name: 'Orchestrator',
        version: '1.0',
        capabilities: ['orchestrate.resilient'],
        publicKey,
      },
      bus,
      onTask: async (_task, ctx) => {
        const result = await executeSubtaskPlan(
          ctx,
          {
            steps: [{ id: 'process', capability: 'work.process', input: { payload: 'data-42' } }],
          },
          {},
          { recovery: { excludeFailedAgents: true } },
        );
        return {
          output: {
            ok: result.ok,
            processed: result.ok ? result.output?.processed : undefined,
            attempts: result.steps[0]?.recoveryAttempts?.length,
          },
        };
      },
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    orchestrator.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'orchestrate.resilient',
      to: 'agent://orchestrator',
      input: {},
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.response?.output?.ok).toBe(true);
    expect((outcome.response?.output as { processed?: string } | undefined)?.processed).toBe(
      'data-42',
    );
    expect(outcome.response?.output?.attempts).toBe(2);

    orchestrator.stop();
    coordinator.stop();
  });

  it('retries the same agent when maxAttemptsPerAgent > 1 and error is retryable', async () => {
    const bus = createMessageBus();
    const publicKey = createCoordinatorIdentity().publicKey;
    let calls = 0;
    const sleepFn = vi.fn(() => Promise.resolve());

    const flaky = createAgentRuntime({
      identity: {
        id: 'agent://flaky',
        name: 'Flaky',
        version: '1.0',
        capabilities: ['work.flaky'],
        publicKey,
      },
      bus,
      onTask: () => {
        calls += 1;
        if (calls < 2) {
          return {
            status: 'error',
            error: { code: 'TRANSIENT', message: 'try again' },
          };
        }
        return { output: { ok: true } };
      },
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
    });

    flaky.start();
    coordinator.start();

    const outcome = await sendTaskWithRecovery(
      coordinator,
      { capability: 'work.flaky', input: {} },
      {
        policy: {
          maxAttemptsPerAgent: 2,
          retryBackoffMs: 10,
          retryableTaskErrorCodes: ['TRANSIENT'],
        },
        sleepFn,
      },
    );

    expect(outcome.ok).toBe(true);
    expect(calls).toBe(2);
    expect(sleepFn).toHaveBeenCalledWith(10);

    flaky.stop();
    coordinator.stop();
  });
});
