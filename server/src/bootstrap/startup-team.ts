/**
 * Autonomous Startup Team bootstrap (Day 23) — used by examples, CLI, and playground.
 * PM → (Designer ∥ Backend ∥ Frontend) → Assemble → QA → Deliver
 */
import type {
  AgentIdentity,
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

import type { ServerContext } from '../api/http/types.js';

/** Default flagship prompt (deterministic, no LLM). */
export const STARTUP_TEAM_DEFAULT_PROMPT = 'Build a habit tracker app.';

export const STARTUP_TEAM_WORKFLOW_ID = 'autonomous-startup-v1';

/** Expected deliverable for smoke tests and `--verify`. */
export const STARTUP_TEAM_EXPECTED_OUTPUT = {
  project_slug: 'habit-tracker',
  project_name: 'Habit Tracker',
  qa_status: 'approved',
  summary: 'Habit Tracker — PM, Designer, Backend, Frontend, and QA delivered a full scaffold.',
  repo_file_count: 7,
} as const;

const PUBLIC_KEY = {
  kty: 'EC',
  crv: 'P-256',
  x: 'WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWlibY',
  y: 'ALOpExF7nDwyk9V4ToWo3L5v_6Y1sQJCrcn_6OlOWf5',
  use: 'sig' as const,
  alg: 'ES256',
  kid: 'oacp-dev-startup-team',
};

export interface StartupTeamBootstrap {
  stop(): void;
}

export interface StartupTeamWorkerBundle {
  readonly runtimes: readonly AgentRuntime[];
  readonly graphRecorder: ReturnType<typeof createDelegationGraphRecorder>;
  startAll(): void;
  stopAll(): void;
}

function chainError(message: string): {
  status: 'error';
  error: { code: string; message: string };
} {
  return { status: 'error', error: { code: 'STARTUP_FAILED', message } };
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, ' ');
}

/** Derive a stable project slug from a natural-language build prompt. */
export function slugFromPrompt(prompt: string): string {
  const lower = normalizePrompt(prompt).toLowerCase();
  if (lower.includes('habit') && lower.includes('track')) {
    return 'habit-tracker';
  }
  const buildMatch = /\bbuild\s+(?:(?:a|an)\s+)?([a-z0-9\s-]+?)(?:\.|$)/i.exec(lower);
  if (buildMatch?.[1]) {
    return buildMatch[1]
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 48);
  }
  return 'startup-app';
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function habitTrackerPlan(slug: string, prompt: string): Record<string, unknown> {
  return {
    project_slug: slug,
    project_name: titleFromSlug(slug),
    prompt: normalizePrompt(prompt),
    product_summary: 'A minimal app to track daily habits, check-ins, and streaks.',
    user_stories: [
      'As a user, I can create habits with a name and frequency',
      'As a user, I can mark habits complete for today',
      'As a user, I can view my current streak per habit',
    ],
    features: ['habit CRUD', 'daily check-in', 'streak counter', 'dashboard'],
  };
}

function genericPlan(slug: string, prompt: string): Record<string, unknown> {
  const name = titleFromSlug(slug);
  return {
    project_slug: slug,
    project_name: name,
    prompt: normalizePrompt(prompt),
    product_summary: `MVP scaffold for: ${normalizePrompt(prompt)}`,
    user_stories: [
      `As a user, I can access core ${name} features`,
      'As a user, I receive clear feedback on actions',
    ],
    features: ['core CRUD', 'dashboard', 'settings'],
  };
}

function buildRepoStructure(slug: string): readonly string[] {
  return [
    `${slug}/README.md`,
    `${slug}/package.json`,
    `${slug}/src/api/routes.ts`,
    `${slug}/src/pages/Dashboard.tsx`,
    `${slug}/src/pages/HabitList.tsx`,
    `${slug}/src/components/HabitCard.tsx`,
    `${slug}/tests/smoke.test.ts`,
  ] as const;
}

/** Startup-team DAG workflow — parallel implementation tracks after PM planning. */
export function createStartupTeamWorkflow(): WorkflowDefinition {
  return {
    id: STARTUP_TEAM_WORKFLOW_ID,
    name: 'Autonomous Startup Team',
    version: '1.0',
    description:
      'PM plans, design/backend/frontend work in parallel, QA signs off, deliver scaffold',
    steps: [
      {
        id: 'plan',
        capability: 'startup.plan',
        mapInput: (ctx) => ({
          prompt: typeof ctx.initialInput.prompt === 'string' ? ctx.initialInput.prompt : '',
        }),
      },
      {
        id: 'design',
        capability: 'startup.design',
        dependsOn: ['plan'],
        mapInput: (ctx) => ctx.getStepResult('plan')?.output ?? {},
      },
      {
        id: 'backend',
        capability: 'startup.backend',
        dependsOn: ['plan'],
        mapInput: (ctx) => ctx.getStepResult('plan')?.output ?? {},
      },
      {
        id: 'frontend',
        capability: 'startup.frontend',
        dependsOn: ['plan'],
        mapInput: (ctx) => ctx.getStepResult('plan')?.output ?? {},
      },
      {
        id: 'assemble',
        capability: 'startup.assemble',
        dependsOn: ['design', 'backend', 'frontend'],
        mapInput: (ctx) => ({
          plan: ctx.getStepResult('plan')?.output,
          design: ctx.getStepResult('design')?.output,
          backend: ctx.getStepResult('backend')?.output,
          frontend: ctx.getStepResult('frontend')?.output,
        }),
      },
      {
        id: 'qa',
        capability: 'startup.qa',
        dependsOn: ['assemble'],
        mapInput: (ctx) => ctx.getStepResult('assemble')?.output ?? {},
      },
      {
        id: 'deliver',
        capability: 'startup.deliver',
        dependsOn: ['qa'],
        mapInput: (ctx) => ({
          plan: ctx.getStepResult('plan')?.output,
          assemble: ctx.getStepResult('assemble')?.output,
          qa: ctx.getStepResult('qa')?.output,
        }),
      },
    ],
    reduceOutput: (ctx) => ctx.getStepResult('deliver')?.output ?? {},
  };
}

export function registerStartupTeamWorkflow(engine: WorkflowEngine): void {
  engine.register(createStartupTeamWorkflow());
}

export function createStartupTeamWorkers(
  bus: InMemoryMessageBus,
  options: {
    readonly taskRecorder: ReturnType<typeof createTaskMemoryRecorder>;
    readonly graphRecorder: ReturnType<typeof createDelegationGraphRecorder>;
    readonly logger?: OacpLogger;
  },
): StartupTeamWorkerBundle {
  const logger =
    options.logger ??
    createConsoleLogger({ level: 'info', json: process.env.OACP_LOG_JSON === '1' });

  const shared = {
    bus,
    taskRecorder: options.taskRecorder,
    delegationGraphRecorder: options.graphRecorder,
    logger,
  };

  const pm = createAgentRuntime({
    identity: {
      id: 'agent://startup-pm',
      name: 'Product Manager',
      version: PROTOCOL_VERSION,
      capabilities: ['startup.plan'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const prompt = typeof task.input.prompt === 'string' ? task.input.prompt : '';
      if (!prompt.trim()) {
        return chainError('PM requires a product prompt');
      }
      const slug = slugFromPrompt(prompt);
      const plan =
        slug === 'habit-tracker' ? habitTrackerPlan(slug, prompt) : genericPlan(slug, prompt);
      return { output: plan };
    },
  });

  const designer = createAgentRuntime({
    identity: {
      id: 'agent://startup-designer',
      name: 'Product Designer',
      version: PROTOCOL_VERSION,
      capabilities: ['startup.design'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const slug =
        typeof task.input.project_slug === 'string' ? task.input.project_slug : 'startup-app';
      const screens =
        slug === 'habit-tracker'
          ? ['Dashboard', 'HabitList', 'HabitDetail', 'CreateHabit']
          : ['Home', 'List', 'Detail', 'Settings'];
      return {
        output: {
          project_slug: slug,
          screens,
          components: ['AppShell', 'PrimaryNav', 'EntityCard', 'ActionButton'],
          theme: 'light-minimal',
        },
      };
    },
  });

  const backend = createAgentRuntime({
    identity: {
      id: 'agent://startup-backend',
      name: 'Backend Developer',
      version: PROTOCOL_VERSION,
      capabilities: ['startup.backend'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const slug =
        typeof task.input.project_slug === 'string' ? task.input.project_slug : 'startup-app';
      const resource = slug === 'habit-tracker' ? 'habits' : 'items';
      return {
        output: {
          project_slug: slug,
          api_routes: [
            { method: 'GET', path: `/api/${resource}` },
            { method: 'POST', path: `/api/${resource}` },
            { method: 'POST', path: `/api/${resource}/:id/check-in` },
          ],
          data_model: {
            Entity: {
              fields: ['id', 'name', 'frequency', 'streak', 'lastCheckIn'],
            },
          },
          stack: 'node-fastify',
        },
      };
    },
  });

  const frontend = createAgentRuntime({
    identity: {
      id: 'agent://startup-frontend',
      name: 'Frontend Developer',
      version: PROTOCOL_VERSION,
      capabilities: ['startup.frontend'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const slug =
        typeof task.input.project_slug === 'string' ? task.input.project_slug : 'startup-app';
      return {
        output: {
          project_slug: slug,
          framework: 'react',
          pages: ['/', '/list', '/new', '/detail/:id'],
          components: ['AppShell', 'EntityCard', 'CheckInButton', 'StreakBadge'],
        },
      };
    },
  });

  const techLead = createAgentRuntime({
    identity: {
      id: 'agent://startup-tech-lead',
      name: 'Tech Lead',
      version: PROTOCOL_VERSION,
      capabilities: ['startup.assemble'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const plan = task.input.plan as Record<string, unknown> | undefined;
      const slug = typeof plan?.project_slug === 'string' ? plan.project_slug : 'startup-app';
      const repoStructure = buildRepoStructure(slug);
      return {
        output: {
          project_slug: slug,
          repo_structure: [...repoStructure],
          tracks_merged: ['design', 'backend', 'frontend'],
        },
      };
    },
  });

  const qa = createAgentRuntime({
    identity: {
      id: 'agent://startup-qa',
      name: 'QA Engineer',
      version: PROTOCOL_VERSION,
      capabilities: ['startup.qa'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const slug =
        typeof task.input.project_slug === 'string' ? task.input.project_slug : 'startup-app';
      const testCases =
        slug === 'habit-tracker'
          ? [
              'Create habit persists and appears on dashboard',
              'Check-in increments streak',
              'API returns 404 for unknown habit id',
            ]
          : [
              'Core CRUD flow succeeds',
              'Dashboard renders primary entities',
              'API health check passes',
            ];
      return {
        output: {
          project_slug: slug,
          test_cases: testCases,
          status: 'approved',
          coverage_target: '80%',
        },
      };
    },
  });

  const deliverer = createAgentRuntime({
    identity: {
      id: 'agent://startup-deliverer',
      name: 'Release Coordinator',
      version: PROTOCOL_VERSION,
      capabilities: ['startup.deliver'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const plan = task.input.plan as Record<string, unknown> | undefined;
      const assemble = task.input.assemble as Record<string, unknown> | undefined;
      const qaResult = task.input.qa as Record<string, unknown> | undefined;

      const slug = typeof plan?.project_slug === 'string' ? plan.project_slug : undefined;
      const name = typeof plan?.project_name === 'string' ? plan.project_name : undefined;
      const prompt = typeof plan?.prompt === 'string' ? plan.prompt : undefined;
      const repoStructure = Array.isArray(assemble?.repo_structure)
        ? assemble.repo_structure.filter((value): value is string => typeof value === 'string')
        : [];
      const qaStatus = typeof qaResult?.status === 'string' ? qaResult.status : undefined;

      if (!slug || !name || !prompt || repoStructure.length === 0 || !qaStatus) {
        return chainError('Deliver step missing plan, repo structure, or QA status');
      }

      const summary =
        slug === 'habit-tracker'
          ? STARTUP_TEAM_EXPECTED_OUTPUT.summary
          : `${name} — PM, Designer, Backend, Frontend, and QA delivered a full scaffold.`;

      return {
        output: {
          project_slug: slug,
          project_name: name,
          prompt,
          repo_structure: repoStructure,
          repo_file_count: repoStructure.length,
          qa_status: qaStatus,
          summary,
          agents_involved: ['pm', 'designer', 'backend', 'frontend', 'qa'],
        },
      };
    },
  });

  const runtimes = [pm, designer, backend, frontend, techLead, qa, deliverer];

  return {
    runtimes,
    graphRecorder: options.graphRecorder,
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

export const STARTUP_TEAM_WORKER_IDENTITIES: readonly AgentIdentity[] = [
  {
    id: 'agent://startup-pm',
    name: 'Product Manager',
    version: PROTOCOL_VERSION,
    capabilities: ['startup.plan'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://startup-designer',
    name: 'Product Designer',
    version: PROTOCOL_VERSION,
    capabilities: ['startup.design'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://startup-backend',
    name: 'Backend Developer',
    version: PROTOCOL_VERSION,
    capabilities: ['startup.backend'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://startup-frontend',
    name: 'Frontend Developer',
    version: PROTOCOL_VERSION,
    capabilities: ['startup.frontend'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://startup-tech-lead',
    name: 'Tech Lead',
    version: PROTOCOL_VERSION,
    capabilities: ['startup.assemble'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://startup-qa',
    name: 'QA Engineer',
    version: PROTOCOL_VERSION,
    capabilities: ['startup.qa'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://startup-deliverer',
    name: 'Release Coordinator',
    version: PROTOCOL_VERSION,
    capabilities: ['startup.deliver'],
    publicKey: PUBLIC_KEY,
  },
] as const;

function registerStartupWorker(context: ServerContext, runtime: AgentRuntime): void {
  context.registry.register(runtime.identity, { replace: true });
  context.bus.register(runtime.identity.id, undefined, {
    capabilities: runtime.identity.capabilities,
    useMailbox: true,
  });
  runtime.start();
}

/** Wire startup team workers, registry, and workflow onto a server context. */
export function bootstrapStartupTeam(
  context: ServerContext,
  options: { readonly logger?: OacpLogger } = {},
): StartupTeamBootstrap {
  const workers = createStartupTeamWorkers(context.bus, {
    taskRecorder: context.taskRecorder,
    graphRecorder: context.delegationGraphRecorder,
    ...(options.logger !== undefined ? { logger: options.logger } : {}),
  });
  registerStartupTeamWorkflow(context.workflowEngine);

  for (const runtime of workers.runtimes) {
    registerStartupWorker(context, runtime);
  }

  return {
    stop(): void {
      workers.stopAll();
    },
  };
}
