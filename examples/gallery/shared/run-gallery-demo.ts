/**
 * Shared HTTP gallery demo runner (Day 25).
 * Used by coding, research, and bug-finder swarms.
 */
import { buildTraceBundle, formatTraceTimeline, noopLogger } from '@oacp/core';
import type { OacpLogger } from '@oacp/core';
import type { ServerContext } from '@oacp/server';
import { createApp } from '@oacp/server';
import { AgentClient } from '@oacp/sdk';

export interface GalleryDemoEnv {
  readonly host: string;
  readonly port: number;
  readonly timeoutMs: number;
  readonly verifyOnly: boolean;
  readonly verifyRecovery: boolean;
}

export interface GalleryVerifyThresholds {
  readonly memoryMin: number;
  readonly graphNodesMin: number;
  readonly messagesMin: number;
}

export interface GalleryDemoSpec {
  readonly section: string;
  readonly workflowId: string;
  readonly workersLabel: string;
  readonly input: Record<string, unknown>;
  readonly expectedOutput: Record<string, unknown>;
  readonly bootstrap: (
    context: ServerContext,
    options: { readonly logger?: OacpLogger },
  ) => { stop(): void };
  readonly outputsMatch: (
    actual: Record<string, unknown> | undefined,
    expected: Record<string, unknown>,
    options: { readonly recoveryExpected: boolean },
  ) => boolean;
  readonly verifyThresholds: GalleryVerifyThresholds;
  readonly simulateFailureEnvKey?: string;
}

export function readGalleryEnv(): GalleryDemoEnv {
  const portRaw = process.env.OACP_PORT;
  const timeoutRaw = process.env.OACP_TIMEOUT_MS;

  return {
    host: process.env.OACP_HOST ?? '127.0.0.1',
    port: portRaw !== undefined && portRaw.length > 0 ? Number(portRaw) : 0,
    timeoutMs: timeoutRaw !== undefined && timeoutRaw.length > 0 ? Number(timeoutRaw) : 60_000,
    verifyOnly: process.argv.includes('--verify'),
    verifyRecovery: process.argv.includes('--verify-recovery'),
  };
}

function log(section: string, message: string): void {
  console.log(`[${section}] ${message}`);
}

export async function runGalleryDemo(spec: GalleryDemoSpec): Promise<void> {
  const env = readGalleryEnv();

  if (env.verifyRecovery && spec.simulateFailureEnvKey !== undefined) {
    process.env[spec.simulateFailureEnvKey] = '1';
  }

  const { app, context } = createApp({ logger: false });
  const quiet = env.verifyOnly || env.verifyRecovery;
  const swarm = spec.bootstrap(context, quiet ? { logger: noopLogger } : {});

  const baseUrl = await app.listen({ host: env.host, port: env.port });

  try {
    const client = new AgentClient({ baseUrl, timeoutMs: env.timeoutMs });

    if (!quiet) {
      log('server', `OACP node listening at ${baseUrl}`);
      log('server', `Workflow registered: ${spec.workflowId}`);
      log('server', `Workers: ${spec.workersLabel}`);
      log('coordinator', `Input: ${JSON.stringify(spec.input)}`);
    }

    const result = await client.runWorkflow(spec.workflowId, spec.input);

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
      const ok = spec.outputsMatch(result.output, spec.expectedOutput, {
        recoveryExpected: env.verifyRecovery,
      });
      if (!ok) {
        console.error('[verify] Output mismatch:', result.output);
        process.exit(1);
      }
      const { memoryMin, graphNodesMin, messagesMin } = spec.verifyThresholds;
      if (memoryEntries.length < memoryMin) {
        console.error(`[verify] Expected >= ${String(memoryMin)} memory entries`);
        process.exit(1);
      }
      if (!graph || graph.nodes.length < graphNodesMin) {
        console.error(`[verify] Expected delegation graph with >= ${String(graphNodesMin)} nodes`);
        process.exit(1);
      }
      if (!bundle || bundle.message_count < messagesMin) {
        console.error(`[verify] Expected >= ${String(messagesMin)} trace messages`);
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
      spec.section,
      'Gallery swarm complete — open the playground to watch the delegation graph.',
    );
    log('hint', `Trace viewer: ${baseUrl}/trace-viewer?trace_id=${traceId}`);
    log('hint', `Playground: ${baseUrl}/playground?trace_id=${traceId}`);
  } finally {
    swarm.stop();
    await context.memoryStore.close();
    await app.close();
  }
}

export function runGalleryDemoMain(spec: GalleryDemoSpec): void {
  runGalleryDemo(spec).catch((error: unknown) => {
    console.error(`[${spec.section}] Fatal error:`, error);
    process.exit(1);
  });
}
