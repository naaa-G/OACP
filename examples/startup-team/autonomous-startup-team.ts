/**
 * OACP Week 4 Day 23 — Autonomous Startup Team flagship demo.
 *
 * Remote coordinator sends a product prompt; seven agents collaborate via DAG workflow:
 * PM → (Designer ∥ Backend ∥ Frontend) → Assemble → QA → Deliver.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:startup
 *
 * Env:
 *   OACP_HOST           — bind host (default: 127.0.0.1)
 *   OACP_PORT           — listen port (default: 0)
 *   OACP_TIMEOUT_MS     — client timeout (default: 60000)
 *   OACP_STARTUP_PROMPT — override product prompt
 *   OACP_LOG_JSON       — JSON structured logs from workers
 *
 * Flags:
 *   --verify  — CI smoke: exit 0 when output matches expected scaffold
 */
import { buildTraceBundle, formatTraceTimeline, noopLogger } from '@oacp/core';
import { createApp } from '@oacp/server';
import { AgentClient } from '@oacp/sdk';

import {
  STARTUP_TEAM_DEFAULT_PROMPT,
  STARTUP_TEAM_EXPECTED_OUTPUT,
  STARTUP_TEAM_WORKFLOW_ID,
  bootstrapStartupTeam,
} from './setup.js';

interface DemoEnv {
  readonly host: string;
  readonly port: number;
  readonly timeoutMs: number;
  readonly verifyOnly: boolean;
  readonly prompt: string;
}

function readEnv(): DemoEnv {
  const portRaw = process.env.OACP_PORT;
  const timeoutRaw = process.env.OACP_TIMEOUT_MS;

  return {
    host: process.env.OACP_HOST ?? '127.0.0.1',
    port: portRaw !== undefined && portRaw.length > 0 ? Number(portRaw) : 0,
    timeoutMs: timeoutRaw !== undefined && timeoutRaw.length > 0 ? Number(timeoutRaw) : 60_000,
    verifyOnly: process.argv.includes('--verify'),
    prompt: process.env.OACP_STARTUP_PROMPT ?? STARTUP_TEAM_DEFAULT_PROMPT,
  };
}

function log(section: string, message: string): void {
  console.log(`[${section}] ${message}`);
}

function outputsMatch(
  actual: Record<string, unknown> | undefined,
  expected: typeof STARTUP_TEAM_EXPECTED_OUTPUT,
): boolean {
  if (!actual) {
    return false;
  }

  const repoStructure = Array.isArray(actual.repo_structure) ? actual.repo_structure : [];

  return (
    actual.project_slug === expected.project_slug &&
    actual.project_name === expected.project_name &&
    actual.qa_status === expected.qa_status &&
    actual.summary === expected.summary &&
    actual.repo_file_count === expected.repo_file_count &&
    repoStructure.length === expected.repo_file_count
  );
}

async function main(): Promise<void> {
  const env = readEnv();

  const { app, context } = createApp({ logger: false });
  const team = bootstrapStartupTeam(context, {
    ...(env.verifyOnly ? { logger: noopLogger } : {}),
  });

  const baseUrl = await app.listen({ host: env.host, port: env.port });

  try {
    const client = new AgentClient({ baseUrl, timeoutMs: env.timeoutMs });

    if (!env.verifyOnly) {
      log('server', `OACP node listening at ${baseUrl}`);
      log('server', `Workflow registered: ${STARTUP_TEAM_WORKFLOW_ID}`);
      log('server', 'Team: PM, Designer, Backend, Frontend, Tech Lead, QA, Release Coordinator');
      log('coordinator', `Prompt: "${env.prompt}"`);
    }

    const result = await client.runWorkflow(STARTUP_TEAM_WORKFLOW_ID, {
      prompt: env.prompt,
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

    if (env.verifyOnly) {
      const ok = outputsMatch(result.output, STARTUP_TEAM_EXPECTED_OUTPUT);
      if (!ok) {
        console.error('[verify] Output mismatch:', result.output);
        process.exit(1);
      }
      if (memoryEntries.length < 7) {
        console.error('[verify] Expected at least 7 memory entries, got', memoryEntries.length);
        process.exit(1);
      }
      if (!graph || graph.nodes.length < 7) {
        console.error('[verify] Expected delegation graph with >= 7 nodes');
        process.exit(1);
      }
      if (!bundle || bundle.message_count < 14) {
        console.error('[verify] Expected at least 14 trace messages, got', bundle?.message_count);
        process.exit(1);
      }
      process.exit(0);
    }

    log('coordinator', 'Startup team delivered project scaffold');
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
    log('demo', 'Flagship demo complete — watch collaboration live in the playground.');
    log('hint', `Playground: ${baseUrl}/playground?trace_id=${traceId}`);
    log('hint', `Trace viewer: ${baseUrl}/trace-viewer?trace_id=${traceId}`);
  } finally {
    team.stop();
    await context.memoryStore.close();
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('[startup-team] Fatal error:', error);
  process.exit(1);
});
