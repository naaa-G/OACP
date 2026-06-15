import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAgentRuntime, PROTOCOL_VERSION } from '@oacp/core';
import { createApp } from '@oacp/server';

import { AgentClient } from '../src/index.js';
import { DEFAULT_DEV_PUBLIC_KEY } from '../src/defaults.js';

/**
 * Smoke contract for Day 23 Autonomous Startup Team.
 * Keep in sync with examples/startup-team/setup.ts.
 */
const STARTUP_PROMPT = 'Build a habit tracker app.';
const STARTUP_WORKFLOW_ID = 'autonomous-startup-v1';

const STARTUP_EXPECTED = {
  project_slug: 'habit-tracker',
  project_name: 'Habit Tracker',
  qa_status: 'approved',
  repo_file_count: 7,
} as const;

describe('Autonomous Startup Team (Day 23)', () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const { app, context } = createApp({ logger: false });

    const shared = {
      bus: context.bus,
      taskRecorder: context.taskRecorder,
      delegationGraphRecorder: context.delegationGraphRecorder,
    };

    const planOutput = {
      project_slug: 'habit-tracker',
      project_name: 'Habit Tracker',
      prompt: STARTUP_PROMPT,
    };

    const repoStructure = [
      'habit-tracker/README.md',
      'habit-tracker/package.json',
      'habit-tracker/src/api/routes.ts',
      'habit-tracker/src/pages/Dashboard.tsx',
      'habit-tracker/src/pages/HabitList.tsx',
      'habit-tracker/src/components/HabitCard.tsx',
      'habit-tracker/tests/smoke.test.ts',
    ];

    const workers = [
      createAgentRuntime({
        identity: {
          id: 'agent://startup-pm',
          name: 'PM',
          version: PROTOCOL_VERSION,
          capabilities: ['startup.plan'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: () => ({ output: planOutput }),
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://startup-designer',
          name: 'Designer',
          version: PROTOCOL_VERSION,
          capabilities: ['startup.design'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: () => ({ output: { project_slug: 'habit-tracker', screens: ['Dashboard'] } }),
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://startup-backend',
          name: 'Backend',
          version: PROTOCOL_VERSION,
          capabilities: ['startup.backend'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: () => ({ output: { project_slug: 'habit-tracker', api_routes: [] } }),
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://startup-frontend',
          name: 'Frontend',
          version: PROTOCOL_VERSION,
          capabilities: ['startup.frontend'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: () => ({ output: { project_slug: 'habit-tracker', pages: ['/'] } }),
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://startup-tech-lead',
          name: 'Tech Lead',
          version: PROTOCOL_VERSION,
          capabilities: ['startup.assemble'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: () => ({
          output: { project_slug: 'habit-tracker', repo_structure: repoStructure },
        }),
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://startup-qa',
          name: 'QA',
          version: PROTOCOL_VERSION,
          capabilities: ['startup.qa'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: () => ({ output: { project_slug: 'habit-tracker', status: 'approved' } }),
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://startup-deliverer',
          name: 'Deliverer',
          version: PROTOCOL_VERSION,
          capabilities: ['startup.deliver'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: () => ({
          output: {
            project_slug: 'habit-tracker',
            project_name: 'Habit Tracker',
            prompt: STARTUP_PROMPT,
            repo_structure: repoStructure,
            repo_file_count: repoStructure.length,
            qa_status: 'approved',
            summary:
              'Habit Tracker — PM, Designer, Backend, Frontend, and QA delivered a full scaffold.',
          },
        }),
      }),
    ];

    for (const worker of workers) {
      await app.inject({
        method: 'POST',
        url: '/agents',
        payload: { identity: worker.identity },
      });
      worker.start();
    }

    context.workflowEngine.register({
      id: STARTUP_WORKFLOW_ID,
      name: 'Autonomous Startup Team',
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
    });

    baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
    closeServer = async () => {
      for (const worker of workers) {
        worker.stop();
      }
      await app.close();
    };
  });

  afterAll(async () => {
    await closeServer();
  });

  it('remote coordinator runs startup team DAG with repo scaffold output', async () => {
    const client = new AgentClient({ baseUrl, timeoutMs: 60_000 });

    const result = await client.runWorkflow(STARTUP_WORKFLOW_ID, {
      prompt: STARTUP_PROMPT,
    });

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({
      project_slug: STARTUP_EXPECTED.project_slug,
      project_name: STARTUP_EXPECTED.project_name,
      qa_status: STARTUP_EXPECTED.qa_status,
      repo_file_count: STARTUP_EXPECTED.repo_file_count,
    });
    expect(Array.isArray(result.output?.repo_structure)).toBe(true);
    expect(result.traceId.length).toBeGreaterThan(0);
    expect(result.steps.length).toBe(7);
  });
});
