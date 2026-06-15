import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '@oacp/server';

import { AgentClient } from '../src/index.js';
import { DEFAULT_DEV_PUBLIC_KEY } from '../src/defaults.js';

/**
 * Smoke contract for Demo v1 (Day 14).
 * Mirrors examples/demo-v1/setup.ts — keep expected output in sync.
 */
const DEMO_V1_INPUT = {
  document: '  INC-1042: latency spike in payment API  ',
} as const;

const DEMO_V1_EXPECTED_OUTPUT = {
  incident_id: 'INC-1042',
  severity: 'high',
  summary: 'Latency spike in payment API',
  report: 'INC-1042 — Latency spike in payment API (severity: high)',
} as const;

describe('Demo v1 — network collaboration (Day 14)', () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const { createAgentRuntime } = await import('@oacp/core');
    const { app, context } = createApp({ logger: false });

    const reporter = createAgentRuntime({
      identity: {
        id: 'agent://reporter',
        name: 'Document Reporter',
        version: '0.1',
        capabilities: ['document.report'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
      bus: context.bus,
      onTask: (task) => {
        const incidentId = typeof task.input.incident_id === 'string' ? task.input.incident_id : '';
        const summary = typeof task.input.summary === 'string' ? task.input.summary : '';
        const severity = task.input.severity;
        if (severity !== 'high' && severity !== 'medium' && severity !== 'low') {
          return { status: 'error', error: { code: 'INVALID', message: 'bad severity' } };
        }
        return {
          output: {
            incident_id: incidentId,
            severity,
            summary,
            report: `${incidentId} — ${summary} (severity: ${severity})`,
          },
        };
      },
    });

    const analyzer = createAgentRuntime({
      identity: {
        id: 'agent://analyzer',
        name: 'Document Analyzer',
        version: '0.1',
        capabilities: ['document.analyze'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
      bus: context.bus,
      onTask: async (task, ctx) => {
        const document = typeof task.input.document === 'string' ? task.input.document : '';
        const match = /INC-\d+/i.exec(document);
        const incidentId = match?.[0]?.toUpperCase();
        if (!incidentId) {
          return { status: 'error', error: { code: 'PARSE', message: 'no incident id' } };
        }
        const summary = 'Latency spike in payment API';
        const downstream = await ctx.sendSubTask({
          capability: 'document.report',
          input: { incident_id: incidentId, summary, severity: 'high' },
        });
        if (!downstream.ok || !downstream.response) {
          return { status: 'error', error: { code: 'CHAIN', message: 'report failed' } };
        }
        const output = downstream.response.output;
        if (!output) {
          return { status: 'error', error: { code: 'CHAIN', message: 'empty output' } };
        }
        return { output };
      },
    });

    const orchestrator = createAgentRuntime({
      identity: {
        id: 'agent://orchestrator',
        name: 'Document Orchestrator',
        version: '0.1',
        capabilities: ['document.pipeline'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
      bus: context.bus,
      onTask: async (task, ctx) => {
        const document = typeof task.input.document === 'string' ? task.input.document : '';
        const downstream = await ctx.sendSubTask({
          capability: 'document.analyze',
          input: { document: document.trim() },
        });
        if (!downstream.ok || !downstream.response) {
          return { status: 'error', error: { code: 'CHAIN', message: 'analyze failed' } };
        }
        const output = downstream.response.output;
        if (!output) {
          return { status: 'error', error: { code: 'CHAIN', message: 'empty output' } };
        }
        return { output };
      },
    });

    for (const identity of [orchestrator.identity, analyzer.identity, reporter.identity]) {
      const response = await app.inject({
        method: 'POST',
        url: '/agents',
        payload: { identity },
      });
      expect(response.statusCode).toBe(200);
    }

    reporter.start();
    analyzer.start();
    orchestrator.start();

    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    baseUrl = address;
    closeServer = async () => {
      orchestrator.stop();
      analyzer.stop();
      reporter.stop();
      await app.close();
    };
  });

  afterAll(async () => {
    await closeServer();
  });

  it('remote coordinator runs document pipeline A → B → C with shared trace_id', async () => {
    const client = new AgentClient({ baseUrl, timeoutMs: 15_000 });

    await client.registerAgent({
      id: 'agent://coordinator',
      name: 'Remote Coordinator',
      version: '0.1',
      capabilities: ['orchestrate.remote'],
      publicKey: DEFAULT_DEV_PUBLIC_KEY,
    });

    const discovered = await client.findAgentsByCapability('document.pipeline');
    expect(discovered.length).toBeGreaterThanOrEqual(1);

    const result = await client.sendTask({
      from: 'agent://coordinator',
      capability: 'document.pipeline',
      input: { document: DEMO_V1_INPUT.document },
      responseTimeoutMs: 15_000,
    });

    expect(result.status).toBe('success');
    expect(result.output).toEqual(DEMO_V1_EXPECTED_OUTPUT);
    expect(result.response?.from).toBe('agent://orchestrator');
    expect(result.request.trace_id.length).toBeGreaterThan(0);
  });
});
