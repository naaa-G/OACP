/**
 * OACP Week 2 Day 14 — Demo v1: three agents collaborating over HTTP.
 *
 * Remote coordinator (AgentClient) kicks off a document pipeline on the OACP server:
 * Orchestrator (A) → Analyzer (B) → Reporter (C) with one shared trace_id.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:demo
 *
 * Env:
 *   OACP_HOST          — bind host (default: 127.0.0.1)
 *   OACP_PORT          — listen port (default: 0 = ephemeral)
 *   OACP_TIMEOUT_MS    — client timeout (default: 15000)
 *   OACP_DEMO_DOCUMENT — override demo input document
 *
 * Flags:
 *   --verify           — exit 0 only when output matches expected (CI smoke)
 */
import { createApp } from '@oacp/server';
import { AgentClient, DEFAULT_DEV_PUBLIC_KEY, PROTOCOL_VERSION } from '@oacp/sdk';

import {
  DEMO_V1_EXPECTED_OUTPUT,
  DEMO_V1_INPUT,
  createDocumentPipelineWorkers,
  formatTraceTimeline,
  registerWorkersOnRegistry,
} from './setup.js';

interface DemoEnv {
  readonly host: string;
  readonly port: number;
  readonly timeoutMs: number;
  readonly verifyOnly: boolean;
  readonly document: string;
}

function readEnv(): DemoEnv {
  const portRaw = process.env.OACP_PORT;
  const timeoutRaw = process.env.OACP_TIMEOUT_MS;

  return {
    host: process.env.OACP_HOST ?? '127.0.0.1',
    port: portRaw !== undefined && portRaw.length > 0 ? Number(portRaw) : 0,
    timeoutMs: timeoutRaw !== undefined && timeoutRaw.length > 0 ? Number(timeoutRaw) : 15_000,
    verifyOnly: process.argv.includes('--verify'),
    document: process.env.OACP_DEMO_DOCUMENT ?? DEMO_V1_INPUT.document,
  };
}

function log(section: string, message: string): void {
  console.log(`[${section}] ${message}`);
}

function outputsMatch(
  actual: Record<string, unknown> | undefined,
  expected: typeof DEMO_V1_EXPECTED_OUTPUT,
): boolean {
  if (!actual) {
    return false;
  }
  return (
    actual.incident_id === expected.incident_id &&
    actual.severity === expected.severity &&
    actual.summary === expected.summary &&
    actual.report === expected.report
  );
}

async function main(): Promise<void> {
  const env = readEnv();
  const { app, context } = createApp({ logger: false });

  await registerWorkersOnRegistry(app);

  const workers = createDocumentPipelineWorkers(context.bus);
  workers.startAll();

  const baseUrl = await app.listen({ host: env.host, port: env.port });

  try {
    const client = new AgentClient({ baseUrl, timeoutMs: env.timeoutMs });

    if (!env.verifyOnly) {
      log('server', `OACP node listening at ${baseUrl}`);
      log('server', 'Registered workers: orchestrator, analyzer, reporter');
    }

    await client.registerAgent({
      id: 'agent://coordinator',
      name: 'Remote Coordinator',
      version: PROTOCOL_VERSION,
      capabilities: ['orchestrate.remote'],
      publicKey: DEFAULT_DEV_PUBLIC_KEY,
    });

    const pipelineAgents = await client.findAgentsByCapability('document.pipeline');
    if (!env.verifyOnly) {
      log('coordinator', `Discovered ${pipelineAgents.length} agent(s) for document.pipeline`);
    }

    const result = await client.sendTask({
      from: 'agent://coordinator',
      capability: 'document.pipeline',
      input: { document: env.document },
      responseTimeoutMs: env.timeoutMs,
    });

    if (result.status !== 'success') {
      console.error('[coordinator] Task failed:', result.error ?? result.status);
      process.exit(1);
    }

    const traceId = result.request.trace_id;
    const traceMessages = context.bus.getMessagesForTrace(traceId);
    const timeline = formatTraceTimeline(traceMessages);

    if (env.verifyOnly) {
      const ok = outputsMatch(result.output, DEMO_V1_EXPECTED_OUTPUT);
      if (!ok) {
        console.error('[verify] Output mismatch:', result.output);
        process.exit(1);
      }
      if (timeline.length < 6) {
        console.error('[verify] Expected at least 6 trace messages, got', timeline.length);
        process.exit(1);
      }
      process.exit(0);
    }

    log('coordinator', 'Task completed successfully');
    console.log('');
    console.log('Output:', result.output);
    console.log('Trace ID:', traceId);
    console.log('Responded by:', result.response?.from);
    console.log('');
    log('trace', `Timeline (${timeline.length} messages):`);
    for (const line of timeline) {
      console.log(`  ${line}`);
    }
    console.log('');
    log('demo', 'Week 2 milestone complete — agents collaborated over the network.');
  } finally {
    workers.stopAll();
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('[demo] Fatal error:', error);
  process.exit(1);
});
