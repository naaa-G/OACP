import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DEFAULT_TASK_RECOVERY_POLICY, createAgentRuntime, PROTOCOL_VERSION } from '@oacp/core';
import { createApp } from '@oacp/server';

import { AgentClient } from '../src/index.js';
import { DEFAULT_DEV_PUBLIC_KEY } from '../src/defaults.js';

/**
 * Smoke contract for Demo v2 (Day 21).
 * Keep expected output in sync with examples/demo-v2/setup.ts.
 */
const DEMO_V2_INPUT = {
  document: '  INC-2048: payment API latency spike affecting checkout  ',
} as const;

const DEMO_V2_EXPECTED_OUTPUT = {
  incident_id: 'INC-2048',
  severity: 'high',
  summary: 'Payment API latency spike affecting checkout',
  report: 'INC-2048 — Payment API latency spike affecting checkout (severity: high)',
} as const;

const DEMO_V2_WORKFLOW_ID = 'incident-response-v2';

describe('Demo v2 — structured task chain (Day 21)', () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const { app, context } = createApp({ logger: false });

    const shared = {
      bus: context.bus,
      taskRecorder: context.taskRecorder,
      delegationGraphRecorder: context.delegationGraphRecorder,
    };

    const workers = [
      createAgentRuntime({
        identity: {
          id: 'agent://intake',
          name: 'Intake',
          version: PROTOCOL_VERSION,
          capabilities: ['incident.intake'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: (task) => {
          const document = typeof task.input.document === 'string' ? task.input.document : '';
          const normalized = document.trim();
          const match = /INC-\d+/i.exec(normalized);
          const incidentId = match?.[0]?.toUpperCase();
          if (!incidentId) {
            return { status: 'error', error: { code: 'PARSE', message: 'no id' } };
          }
          return { output: { incident_id: incidentId, normalized_document: normalized } };
        },
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://classifier-01-primary',
          name: 'Classifier Primary',
          version: PROTOCOL_VERSION,
          capabilities: ['incident.classify'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: () => ({ output: { severity: 'high', tier: 'primary' } }),
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://classifier-02-backup',
          name: 'Classifier Backup',
          version: PROTOCOL_VERSION,
          capabilities: ['incident.classify'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: () => ({ output: { severity: 'high', tier: 'backup' } }),
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://enricher',
          name: 'Enricher',
          version: PROTOCOL_VERSION,
          capabilities: ['incident.enrich'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: () => ({ output: { entities: ['payment API', 'checkout'] } }),
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://synthesizer',
          name: 'Synthesizer',
          version: PROTOCOL_VERSION,
          capabilities: ['incident.synthesize'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: (task) => ({
          output: {
            incident_id: task.input.incident_id,
            severity: task.input.severity,
            summary: DEMO_V2_EXPECTED_OUTPUT.summary,
            entities: task.input.entities,
            action_items: ['Scale payment API replicas', 'Enable checkout fallback mode'],
          },
        }),
      }),
      createAgentRuntime({
        identity: {
          id: 'agent://publisher',
          name: 'Publisher',
          version: PROTOCOL_VERSION,
          capabilities: ['incident.publish'],
          publicKey: DEFAULT_DEV_PUBLIC_KEY,
        },
        ...shared,
        onTask: (task) => ({
          output: {
            incident_id: task.input.incident_id,
            severity: task.input.severity,
            summary: task.input.summary,
            entities: task.input.entities,
            action_items: task.input.action_items,
            report: DEMO_V2_EXPECTED_OUTPUT.report,
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
      id: DEMO_V2_WORKFLOW_ID,
      name: 'Incident Response v2',
      steps: [
        {
          id: 'intake',
          capability: 'incident.intake',
          mapInput: (ctx) => ({
            document:
              typeof ctx.initialInput.document === 'string' ? ctx.initialInput.document : '',
          }),
        },
        {
          id: 'classify',
          capability: 'incident.classify',
          dependsOn: ['intake'],
          recovery: DEFAULT_TASK_RECOVERY_POLICY,
          mapInput: (ctx) => ({
            incident_id: ctx.getStepResult('intake')?.output?.incident_id,
            document: ctx.getStepResult('intake')?.output?.normalized_document,
          }),
        },
        {
          id: 'enrich',
          capability: 'incident.enrich',
          dependsOn: ['intake'],
          mapInput: (ctx) => ({
            incident_id: ctx.getStepResult('intake')?.output?.incident_id,
            document: ctx.getStepResult('intake')?.output?.normalized_document,
          }),
        },
        {
          id: 'synthesize',
          capability: 'incident.synthesize',
          dependsOn: ['classify', 'enrich'],
          mapInput: (ctx) => ({
            incident_id: ctx.getStepResult('intake')?.output?.incident_id,
            severity: ctx.getStepResult('classify')?.output?.severity,
            entities: ctx.getStepResult('enrich')?.output?.entities,
            document: ctx.getStepResult('intake')?.output?.normalized_document,
          }),
        },
        {
          id: 'publish',
          capability: 'incident.publish',
          dependsOn: ['synthesize'],
          mapInput: (ctx) => ctx.getStepResult('synthesize')?.output ?? {},
        },
      ],
      reduceOutput: (ctx) => ctx.getStepResult('publish')?.output ?? {},
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

  it('remote coordinator runs incident-response DAG with shared trace_id', async () => {
    const client = new AgentClient({ baseUrl, timeoutMs: 30_000 });

    const result = await client.runWorkflow(DEMO_V2_WORKFLOW_ID, {
      document: DEMO_V2_INPUT.document,
    });

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({
      incident_id: DEMO_V2_EXPECTED_OUTPUT.incident_id,
      severity: DEMO_V2_EXPECTED_OUTPUT.severity,
      summary: DEMO_V2_EXPECTED_OUTPUT.summary,
      report: DEMO_V2_EXPECTED_OUTPUT.report,
    });
    expect(result.traceId.length).toBeGreaterThan(0);
    expect(result.steps.length).toBe(5);
  });
});
