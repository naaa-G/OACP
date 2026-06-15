/**
 * Bug-finder swarm — scan → triage → (reproduce ∥ analyze) → fix → verify (Day 25).
 * Uses resilient reproduce step with primary/backup agents (Day 19 pattern).
 */
import type {
  AgentRuntime,
  InMemoryMessageBus,
  OacpLogger,
  WorkflowDefinition,
  WorkflowEngine,
} from '@oacp/core';
import {
  DEFAULT_TASK_RECOVERY_POLICY,
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

export const BUG_FINDER_SWARM_WORKFLOW_ID = 'bug-finder-swarm-v1';

export const BUG_FINDER_SWARM_DEFAULT_INPUT = {
  repo: 'payment-api',
  log_excerpt: 'NullReferenceException in PaymentProcessor.Process at line 42',
} as const;

export const BUG_FINDER_SWARM_EXPECTED_OUTPUT = {
  bug_id: 'BUG-1042',
  repo: 'payment-api',
  severity: 'high',
  root_cause: 'Null checkout session when retry path bypasses validation',
  fix_summary: 'Add guard clause before PaymentProcessor.Process()',
  verification_status: 'reproduced',
  recovery_used: false,
} as const;

export const REPRODUCE_PRIMARY_ID = 'agent://bug-reproduce-01-primary';
export const REPRODUCE_BACKUP_ID = 'agent://bug-reproduce-02-backup';

const PUBLIC_KEY = DEFAULT_DEV_PUBLIC_KEY;

function shouldPrimaryReproduceFail(): boolean {
  const value = process.env.OACP_BUG_FINDER_SIMULATE_FAILURE?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function parseBugId(logExcerpt: string): string | undefined {
  const match = /line\s+(\d+)/i.exec(logExcerpt);
  if (!match?.[1]) {
    return undefined;
  }
  return `BUG-10${match[1]}`;
}

export function createBugFinderSwarmWorkflow(): WorkflowDefinition {
  return {
    id: BUG_FINDER_SWARM_WORKFLOW_ID,
    name: 'Bug Finder Swarm',
    version: '1.0',
    description: 'Scan logs, triage, reproduce with failover, analyze root cause, propose fix',
    steps: [
      {
        id: 'scan',
        capability: 'bug.scan',
        mapInput: (ctx) => ({
          repo: ctx.initialInput.repo,
          log_excerpt: ctx.initialInput.log_excerpt,
        }),
      },
      {
        id: 'triage',
        capability: 'bug.triage',
        dependsOn: ['scan'],
        mapInput: (ctx) => ctx.getStepResult('scan')?.output ?? {},
      },
      {
        id: 'reproduce',
        capability: 'bug.reproduce',
        dependsOn: ['triage'],
        recovery: DEFAULT_TASK_RECOVERY_POLICY,
        mapInput: (ctx) => ctx.getStepResult('triage')?.output ?? {},
      },
      {
        id: 'analyze',
        capability: 'bug.analyze',
        dependsOn: ['triage'],
        mapInput: (ctx) => ctx.getStepResult('triage')?.output ?? {},
      },
      {
        id: 'fix',
        capability: 'bug.fix',
        dependsOn: ['reproduce', 'analyze'],
        mapInput: (ctx) => ({
          ...(ctx.getStepResult('triage')?.output ?? {}),
          reproduction: ctx.getStepResult('reproduce')?.output,
          root_cause: ctx.getStepResult('analyze')?.output?.root_cause,
        }),
      },
      {
        id: 'verify',
        capability: 'bug.verify',
        dependsOn: ['fix'],
        mapInput: (ctx) => ctx.getStepResult('fix')?.output ?? {},
      },
    ],
    reduceOutput: (ctx) => {
      const published = ctx.getStepResult('verify')?.output;
      const reproduceStep = ctx.getStepResult('reproduce');
      const recoveryUsed = (reproduceStep?.recoveryAttempts?.length ?? 0) > 1;
      return {
        ...(published ?? {}),
        recovery_used: recoveryUsed,
      };
    },
  };
}

export function registerBugFinderSwarmWorkflow(engine: WorkflowEngine): void {
  engine.register(createBugFinderSwarmWorkflow());
}

export function createBugFinderSwarmWorkers(
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

  const scanner = createAgentRuntime({
    identity: {
      id: 'agent://bug-scanner',
      name: 'Bug Scanner',
      version: PROTOCOL_VERSION,
      capabilities: ['bug.scan'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const repo = typeof task.input.repo === 'string' ? task.input.repo : undefined;
      const logExcerpt = typeof task.input.log_excerpt === 'string' ? task.input.log_excerpt : '';
      const bugId = parseBugId(logExcerpt);
      if (!repo || !bugId) {
        return chainError('Scanner requires repo and parseable log excerpt');
      }
      return {
        output: {
          repo,
          bug_id: bugId,
          log_excerpt: logExcerpt,
          exception_type: 'NullReferenceException',
        },
      };
    },
  });

  const triager = createAgentRuntime({
    identity: {
      id: 'agent://bug-triager',
      name: 'Bug Triager',
      version: PROTOCOL_VERSION,
      capabilities: ['bug.triage'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const repo = typeof task.input.repo === 'string' ? task.input.repo : 'unknown';
      const bugId = typeof task.input.bug_id === 'string' ? task.input.bug_id : 'BUG-0000';
      const logExcerpt = typeof task.input.log_excerpt === 'string' ? task.input.log_excerpt : '';
      const severity = logExcerpt.toLowerCase().includes('null') ? 'high' : 'medium';
      return {
        output: {
          repo,
          bug_id: bugId,
          severity,
          component: 'PaymentProcessor',
          log_excerpt: logExcerpt,
        },
      };
    },
  });

  const reproducePrimary = createAgentRuntime({
    identity: {
      id: REPRODUCE_PRIMARY_ID,
      name: 'Reproduce Primary',
      version: PROTOCOL_VERSION,
      capabilities: ['bug.reproduce'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      if (shouldPrimaryReproduceFail()) {
        return {
          status: 'error',
          error: { code: 'REPRODUCE_ENV_DOWN', message: 'Primary repro sandbox unavailable' },
        };
      }
      const bugId = typeof task.input.bug_id === 'string' ? task.input.bug_id : 'BUG-0000';
      return {
        output: {
          bug_id: bugId,
          reproduced: true,
          tier: 'primary',
          steps: ['seed checkout session', 'invoke retry path', 'observe NullReferenceException'],
        },
      };
    },
  });

  const reproduceBackup = createAgentRuntime({
    identity: {
      id: REPRODUCE_BACKUP_ID,
      name: 'Reproduce Backup',
      version: PROTOCOL_VERSION,
      capabilities: ['bug.reproduce'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const bugId = typeof task.input.bug_id === 'string' ? task.input.bug_id : 'BUG-0000';
      return {
        output: {
          bug_id: bugId,
          reproduced: true,
          tier: 'backup',
          steps: ['replay trace from log_excerpt', 'confirm null session on retry branch'],
        },
      };
    },
  });

  const analyzer = createAgentRuntime({
    identity: {
      id: 'agent://bug-analyzer',
      name: 'Root Cause Analyzer',
      version: PROTOCOL_VERSION,
      capabilities: ['bug.analyze'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const bugId = typeof task.input.bug_id === 'string' ? task.input.bug_id : 'BUG-0000';
      const repo = typeof task.input.repo === 'string' ? task.input.repo : 'unknown';
      return {
        output: {
          bug_id: bugId,
          repo,
          root_cause: BUG_FINDER_SWARM_EXPECTED_OUTPUT.root_cause,
        },
      };
    },
  });

  const fixer = createAgentRuntime({
    identity: {
      id: 'agent://bug-fixer',
      name: 'Fix Proposer',
      version: PROTOCOL_VERSION,
      capabilities: ['bug.fix'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const bugId = typeof task.input.bug_id === 'string' ? task.input.bug_id : 'BUG-0000';
      const repo = typeof task.input.repo === 'string' ? task.input.repo : 'unknown';
      const rootCause =
        typeof task.input.root_cause === 'string'
          ? task.input.root_cause
          : BUG_FINDER_SWARM_EXPECTED_OUTPUT.root_cause;
      const reproduction = task.input.reproduction as { reproduced?: boolean } | undefined;
      if (!reproduction?.reproduced) {
        return chainError('Fix step requires successful reproduction');
      }
      return {
        output: {
          bug_id: bugId,
          repo,
          severity: task.input.severity === 'high' ? 'high' : 'medium',
          root_cause: rootCause,
          fix_summary: BUG_FINDER_SWARM_EXPECTED_OUTPUT.fix_summary,
          patch_files: ['src/PaymentProcessor.cs'],
        },
      };
    },
  });

  const verifier = createAgentRuntime({
    identity: {
      id: 'agent://bug-verifier',
      name: 'Bug Verifier',
      version: PROTOCOL_VERSION,
      capabilities: ['bug.verify'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const bugId = typeof task.input.bug_id === 'string' ? task.input.bug_id : 'BUG-0000';
      const repo = typeof task.input.repo === 'string' ? task.input.repo : 'unknown';
      const severity = task.input.severity === 'high' ? 'high' : 'medium';
      const rootCause =
        typeof task.input.root_cause === 'string'
          ? task.input.root_cause
          : BUG_FINDER_SWARM_EXPECTED_OUTPUT.root_cause;
      const fixSummary =
        typeof task.input.fix_summary === 'string'
          ? task.input.fix_summary
          : BUG_FINDER_SWARM_EXPECTED_OUTPUT.fix_summary;

      return {
        output: {
          bug_id: bugId,
          repo,
          severity,
          root_cause: rootCause,
          fix_summary: fixSummary,
          verification_status: 'reproduced',
        },
      };
    },
  });

  const runtimes: readonly AgentRuntime[] = [
    scanner,
    triager,
    reproducePrimary,
    reproduceBackup,
    analyzer,
    fixer,
    verifier,
  ];

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

export function bootstrapBugFinderSwarm(
  context: ServerContext,
  options: { readonly logger?: OacpLogger } = {},
): { stop(): void } {
  const workers = createBugFinderSwarmWorkers(context.bus, {
    taskRecorder: context.taskRecorder,
    graphRecorder: context.delegationGraphRecorder,
    ...(options.logger !== undefined ? { logger: options.logger } : {}),
  });
  return wireGallerySwarm(context, {
    workers,
    registerWorkflow: registerBugFinderSwarmWorkflow,
  });
}

export function bugFinderOutputsMatch(
  actual: Record<string, unknown> | undefined,
  expected: typeof BUG_FINDER_SWARM_EXPECTED_OUTPUT,
  options: { readonly recoveryExpected: boolean },
): boolean {
  if (!actual) {
    return false;
  }

  const baseMatch =
    actual.bug_id === expected.bug_id &&
    actual.repo === expected.repo &&
    actual.severity === expected.severity &&
    actual.root_cause === expected.root_cause &&
    actual.fix_summary === expected.fix_summary &&
    actual.verification_status === expected.verification_status;

  if (!baseMatch) {
    return false;
  }

  if (options.recoveryExpected) {
    return actual.recovery_used === true;
  }

  return actual.recovery_used !== true;
}
