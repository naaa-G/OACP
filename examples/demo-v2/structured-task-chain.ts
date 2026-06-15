/**
 * OACP Week 3 Day 21 — Demo v2: structured task chain over HTTP.
 *
 * Remote coordinator triggers a DAG workflow on the OACP server. Six agents execute
 * intake → (classify ∥ enrich) → synthesize → publish with shared memory, delegation
 * graph, recovery, and trace observability.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:demo-v2
 *
 * Env:
 *   OACP_HOST                      — bind host (default: 127.0.0.1)
 *   OACP_PORT                      — listen port (default: 0)
 *   OACP_TIMEOUT_MS                — client timeout (default: 30000)
 *   OACP_DEMO_DOCUMENT             — override demo input document
 *   OACP_DEMO_V2_SIMULATE_FAILURE   — primary classifier fails; backup recovers (1/true)
 *   OACP_LOG_JSON                  — JSON structured logs from workers
 *
 * Flags:
 *   --verify           — CI smoke: exit 0 when output matches expected
 *   --verify-recovery  — CI smoke with primary classifier failure + backup recovery
 */
import { buildTraceBundle, formatTraceTimeline } from '@oacp/core';
import { createApp } from '@oacp/server';
import { AgentClient } from '@oacp/sdk';

import {
  DEMO_V2_EXPECTED_OUTPUT,
  DEMO_V2_INPUT,
  DEMO_V2_WORKFLOW_ID,
  bootstrapDemoV2,
  registerWorkersOnRegistry,
} from './setup.js';
import { noopLogger } from '@oacp/core';

interface DemoEnv {
  readonly host: string;
  readonly port: number;
  readonly timeoutMs: number;
  readonly verifyOnly: boolean;
  readonly verifyRecovery: boolean;
  readonly document: string;
}

function readEnv(): DemoEnv {
  const portRaw = process.env.OACP_PORT;
  const timeoutRaw = process.env.OACP_TIMEOUT_MS;

  return {
    host: process.env.OACP_HOST ?? '127.0.0.1',
    port: portRaw !== undefined && portRaw.length > 0 ? Number(portRaw) : 0,
    timeoutMs: timeoutRaw !== undefined && timeoutRaw.length > 0 ? Number(timeoutRaw) : 30_000,
    verifyOnly: process.argv.includes('--verify'),
    verifyRecovery: process.argv.includes('--verify-recovery'),
    document: process.env.OACP_DEMO_DOCUMENT ?? DEMO_V2_INPUT.document,
  };
}

function log(section: string, message: string): void {
  console.log(`[${section}] ${message}`);
}

function outputsMatch(
  actual: Record<string, unknown> | undefined,
  expected: typeof DEMO_V2_EXPECTED_OUTPUT,
  options: { recoveryExpected: boolean },
): boolean {
  if (!actual) {
    return false;
  }

  const baseMatch =
    actual.incident_id === expected.incident_id &&
    actual.severity === expected.severity &&
    actual.summary === expected.summary &&
    actual.report === expected.report &&
    JSON.stringify(actual.entities) === JSON.stringify(expected.entities) &&
    JSON.stringify(actual.action_items) === JSON.stringify(expected.action_items);

  if (!baseMatch) {
    return false;
  }

  if (options.recoveryExpected) {
    return actual.recovery_used === true;
  }

  return actual.recovery_used !== true;
}

async function main(): Promise<void> {
  const env = readEnv();

  if (env.verifyRecovery) {
    process.env.OACP_DEMO_V2_SIMULATE_FAILURE = '1';
  }

  const { app, context } = createApp({ logger: false });
  const quietVerify = env.verifyOnly || env.verifyRecovery;
  const workers = bootstrapDemoV2(context, {
    ...(quietVerify ? { logger: noopLogger } : {}),
  });

  await registerWorkersOnRegistry(app);
  workers.startAll();

  const baseUrl = await app.listen({ host: env.host, port: env.port });

  try {
    const client = new AgentClient({ baseUrl, timeoutMs: env.timeoutMs });

    if (!env.verifyOnly && !env.verifyRecovery) {
      log('server', `OACP node listening at ${baseUrl}`);
      log('server', `Workflow registered: ${DEMO_V2_WORKFLOW_ID}`);
      log(
        'server',
        'Workers: intake, classifier-01-primary, classifier-02-backup, enricher, synthesizer, publisher',
      );
    }

    const result = await client.runWorkflow(DEMO_V2_WORKFLOW_ID, {
      document: env.document,
    });

    if (!result.ok) {
      console.error('[coordinator] Workflow failed:', result.error.message);
      process.exit(1);
    }

    const traceId = result.traceId;
    const memoryEntries = await context.memoryStore.query({ trace_id: traceId, limit: 100 });
    const graph = await context.delegationGraphRecorder.getGraph(traceId);
    const busRecord = context.bus.getTrace(traceId);
    const bundle = buildTraceBundle({
      traceId,
      messages: busRecord?.messages ?? [],
      ...(graph !== undefined ? { graph } : {}),
      ...(memoryEntries.length > 0 ? { memoryEntries } : {}),
    });

    if (env.verifyOnly || env.verifyRecovery) {
      const ok = outputsMatch(result.output, DEMO_V2_EXPECTED_OUTPUT, {
        recoveryExpected: env.verifyRecovery,
      });
      if (!ok) {
        console.error('[verify] Output mismatch:', result.output);
        process.exit(1);
      }
      if (memoryEntries.length < 5) {
        console.error('[verify] Expected at least 5 memory entries, got', memoryEntries.length);
        process.exit(1);
      }
      if (!graph || graph.nodes.length < 5) {
        console.error('[verify] Expected delegation graph with >= 5 nodes');
        process.exit(1);
      }
      if (!bundle || bundle.message_count < 10) {
        console.error('[verify] Expected at least 10 trace messages, got', bundle?.message_count);
        process.exit(1);
      }
      process.exit(0);
    }

    log('coordinator', 'Workflow completed successfully');
    console.log('');
    console.log('Output:', result.output);
    console.log('Run ID:', result.runId);
    console.log('Trace ID:', traceId);
    console.log('Steps completed:', result.steps.length);
    console.log('Memory entries:', memoryEntries.length);
    if (graph) {
      console.log(`Delegation graph: ${graph.nodes.length} nodes, depth ${graph.depth}`);
    }
    console.log('');
    if (bundle) {
      log('trace', formatTraceTimeline(bundle.timeline, { graph: bundle.graph }));
    }
    console.log('');
    log(
      'demo',
      'Week 3 milestone complete — structured task chain with memory, DAG, recovery, and traces.',
    );
    log('hint', `Trace viewer: ${baseUrl}/trace-viewer?trace_id=${traceId}`);
    log('hint', `Playground: ${baseUrl}/playground?trace_id=${traceId}`);
  } finally {
    workers.stopAll();
    await context.memoryStore.close();
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('[demo-v2] Fatal error:', error);
  process.exit(1);
});
