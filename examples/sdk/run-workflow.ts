/**
 * OACP SDK example — run a workflow via AgentClient.
 *
 * Requires startup team bootstrapped on the server:
 *   pnpm oacp serve --bootstrap startup
 *
 * Or use ephemeral CLI:
 *   pnpm oacp run "build todo app" --format json
 *
 * Run against running server:
 *   pnpm build
 *   OACP_BASE_URL=http://127.0.0.1:3000 pnpm --filter oacp-examples start:sdk-workflow
 */
import { createAgentClient } from '@oacp/sdk/client';

const STARTUP_WORKFLOW_ID = 'autonomous-startup-v1';

async function main(): Promise<void> {
  const baseUrl = process.env.OACP_BASE_URL ?? 'http://127.0.0.1:3000';
  const client = createAgentClient(baseUrl, {
    timeoutMs: Number(process.env.OACP_TIMEOUT_MS ?? 60_000),
  });

  const prompt = process.env.OACP_STARTUP_PROMPT ?? 'build habit tracker';
  console.log(`[sdk] Running workflow ${STARTUP_WORKFLOW_ID}`);
  console.log(`[sdk] Prompt: "${prompt}"`);

  const result = await client.runWorkflow(STARTUP_WORKFLOW_ID, { prompt });

  if (!result.ok) {
    console.error('[sdk] Workflow failed:', result.error?.message ?? 'unknown');
    process.exit(1);
  }

  console.log('[sdk] Trace ID:', result.traceId);
  console.log('[sdk] Output:', result.output);
  console.log('[sdk] Playground:', `${baseUrl}/playground?trace_id=${result.traceId}`);
}

main().catch((error: unknown) => {
  console.error('[sdk] Fatal error:', error);
  process.exit(1);
});
