/**
 * Coding swarm — plan → implement → review → test → deliver (Day 25).
 */
import type {
  AgentRuntime,
  InMemoryMessageBus,
  OacpLogger,
  WorkflowDefinition,
  WorkflowEngine,
} from '@oacp/core';
import {
  PROTOCOL_VERSION,
  createAgentRuntime,
  createConsoleLogger,
  createDelegationGraphRecorder,
  createTaskMemoryRecorder,
} from '@oacp/core';
import type { ServerContext } from '@oacp/server';
import { DEFAULT_DEV_PUBLIC_KEY } from '@oacp/sdk';

import {
  type GalleryWorkerBundle,
  chainError,
  wireGallerySwarm,
} from '../shared/gallery-bootstrap.js';

export const CODING_SWARM_WORKFLOW_ID = 'coding-swarm-v1';

export const CODING_SWARM_DEFAULT_INPUT = {
  module: 'auth-service',
  task: 'rate limiting middleware',
} as const;

export const CODING_SWARM_EXPECTED_OUTPUT = {
  module: 'auth-service',
  feature: 'rate limiting middleware',
  status: 'ready',
  review_status: 'approved',
  test_status: 'passed',
  files_changed: ['src/middleware/rateLimit.ts', 'src/routes/auth.ts', 'tests/rateLimit.test.ts'],
} as const;

const PUBLIC_KEY = DEFAULT_DEV_PUBLIC_KEY;

export function createCodingSwarmWorkflow(): WorkflowDefinition {
  return {
    id: CODING_SWARM_WORKFLOW_ID,
    name: 'Coding Swarm',
    version: '1.0',
    description: 'Plan, implement, review, test, and deliver a code change',
    steps: [
      {
        id: 'plan',
        capability: 'code.plan',
        mapInput: (ctx) => ({
          module: ctx.initialInput.module,
          task: ctx.initialInput.task,
        }),
      },
      {
        id: 'implement',
        capability: 'code.implement',
        dependsOn: ['plan'],
        mapInput: (ctx) => ctx.getStepResult('plan')?.output ?? {},
      },
      {
        id: 'review',
        capability: 'code.review',
        dependsOn: ['implement'],
        mapInput: (ctx) => ctx.getStepResult('implement')?.output ?? {},
      },
      {
        id: 'test',
        capability: 'code.test',
        dependsOn: ['review'],
        mapInput: (ctx) => ctx.getStepResult('review')?.output ?? {},
      },
      {
        id: 'deliver',
        capability: 'code.deliver',
        dependsOn: ['test'],
        mapInput: (ctx) => ctx.getStepResult('test')?.output ?? {},
      },
    ],
    reduceOutput: (ctx) => ctx.getStepResult('deliver')?.output ?? {},
  };
}

export function registerCodingSwarmWorkflow(engine: WorkflowEngine): void {
  engine.register(createCodingSwarmWorkflow());
}

export function createCodingSwarmWorkers(
  bus: InMemoryMessageBus,
  options: {
    readonly taskRecorder: ReturnType<typeof createTaskMemoryRecorder>;
    readonly graphRecorder: ReturnType<typeof createDelegationGraphRecorder>;
    readonly logger?: OacpLogger;
  },
): GalleryWorkerBundle {
  const logger =
    options.logger ??
    createConsoleLogger({ level: 'info', json: process.env.OACP_LOG_JSON === '1' });

  const shared = {
    bus,
    taskRecorder: options.taskRecorder,
    delegationGraphRecorder: options.graphRecorder,
    logger,
  };

  const planner = createAgentRuntime({
    identity: {
      id: 'agent://code-planner',
      name: 'Code Planner',
      version: PROTOCOL_VERSION,
      capabilities: ['code.plan'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const module = typeof task.input.module === 'string' ? task.input.module : undefined;
      const feature = typeof task.input.task === 'string' ? task.input.task : undefined;
      if (!module || !feature) {
        return chainError('Planner requires module and task');
      }
      return {
        output: {
          module,
          feature,
          plan: [
            'Add rateLimit middleware factory',
            'Wire middleware on auth routes',
            'Add unit tests for 429 responses',
          ],
        },
      };
    },
  });

  const implementer = createAgentRuntime({
    identity: {
      id: 'agent://code-implementer',
      name: 'Code Implementer',
      version: PROTOCOL_VERSION,
      capabilities: ['code.implement'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const module = typeof task.input.module === 'string' ? task.input.module : 'unknown';
      const feature = typeof task.input.feature === 'string' ? task.input.feature : 'change';
      return {
        output: {
          module,
          feature,
          files_changed: [
            'src/middleware/rateLimit.ts',
            'src/routes/auth.ts',
            'tests/rateLimit.test.ts',
          ],
          diff_lines: 142,
        },
      };
    },
  });

  const reviewer = createAgentRuntime({
    identity: {
      id: 'agent://code-reviewer',
      name: 'Code Reviewer',
      version: PROTOCOL_VERSION,
      capabilities: ['code.review'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const module = typeof task.input.module === 'string' ? task.input.module : 'unknown';
      const feature = typeof task.input.feature === 'string' ? task.input.feature : 'change';
      const files = Array.isArray(task.input.files_changed)
        ? task.input.files_changed.filter((v): v is string => typeof v === 'string')
        : [];
      return {
        output: {
          module,
          feature,
          files_changed: files,
          review_status: 'approved',
          comments: [],
        },
      };
    },
  });

  const tester = createAgentRuntime({
    identity: {
      id: 'agent://code-tester',
      name: 'Code Tester',
      version: PROTOCOL_VERSION,
      capabilities: ['code.test'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const module = typeof task.input.module === 'string' ? task.input.module : 'unknown';
      const feature = typeof task.input.feature === 'string' ? task.input.feature : 'change';
      const files = Array.isArray(task.input.files_changed)
        ? task.input.files_changed.filter((v): v is string => typeof v === 'string')
        : [];
      return {
        output: {
          module,
          feature,
          files_changed: files,
          review_status:
            task.input.review_status === 'approved'
              ? ('approved' as const)
              : ('changes_requested' as const),
          test_status: 'passed',
          tests_run: 12,
        },
      };
    },
  });

  const deliverer = createAgentRuntime({
    identity: {
      id: 'agent://code-deliverer',
      name: 'Code Deliverer',
      version: PROTOCOL_VERSION,
      capabilities: ['code.deliver'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const module = typeof task.input.module === 'string' ? task.input.module : 'unknown';
      const feature = typeof task.input.feature === 'string' ? task.input.feature : 'change';
      const files = Array.isArray(task.input.files_changed)
        ? task.input.files_changed.filter((v): v is string => typeof v === 'string')
        : [];
      const reviewStatus =
        task.input.review_status === 'approved' ? 'approved' : 'changes_requested';
      const testStatus = task.input.test_status === 'passed' ? 'passed' : 'failed';

      if (reviewStatus !== 'approved' || testStatus !== 'passed') {
        return chainError('Cannot deliver — review or tests did not pass');
      }

      return {
        output: {
          module,
          feature,
          status: 'ready',
          review_status: reviewStatus,
          test_status: testStatus,
          files_changed: files,
          summary: `${module} — ${feature} ready for merge`,
        },
      };
    },
  });

  const runtimes: readonly AgentRuntime[] = [planner, implementer, reviewer, tester, deliverer];

  return {
    runtimes,
    startAll() {
      for (const runtime of runtimes) {
        runtime.start();
      }
    },
    stopAll() {
      for (const runtime of runtimes) {
        runtime.stop();
      }
    },
  };
}

export function bootstrapCodingSwarm(
  context: ServerContext,
  options: { readonly logger?: OacpLogger } = {},
): { stop(): void } {
  const workers = createCodingSwarmWorkers(context.bus, {
    taskRecorder: context.taskRecorder,
    graphRecorder: context.delegationGraphRecorder,
    ...(options.logger !== undefined ? { logger: options.logger } : {}),
  });
  return wireGallerySwarm(context, {
    workers,
    registerWorkflow: registerCodingSwarmWorkflow,
  });
}

export function codingOutputsMatch(
  actual: Record<string, unknown> | undefined,
  expected: typeof CODING_SWARM_EXPECTED_OUTPUT,
): boolean {
  if (!actual) {
    return false;
  }
  return (
    actual.module === expected.module &&
    actual.feature === expected.feature &&
    actual.status === expected.status &&
    actual.review_status === expected.review_status &&
    actual.test_status === expected.test_status &&
    JSON.stringify(actual.files_changed) === JSON.stringify(expected.files_changed)
  );
}
