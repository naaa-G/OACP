/**
 * Day 58 — minimal bring-your-own-agents trace (no MCPLab).
 *
 * Registers two agents, sends a delegated task + response, prints Console URL.
 *
 * Prerequisites:
 *   docker compose up -d
 *   # or: pnpm oacp serve --bootstrap demo
 *
 * Run:
 *   pnpm --filter oacp-examples start:custom-agents
 */
import { buildTaskRequest, buildTaskResponse, createTraceId } from '@oacp/core';
import { createAgentClient, registerDevAgent } from '@oacp/sdk/client';
import { buildConsoleTraceUrl } from '@oacp/sdk';

const COORDINATOR_ID = 'agent://custom-planner';
const WORKER_ID = 'agent://custom-worker';
const FLEET = 'custom-demo';

function apiKeyHeaders(): Record<string, string> | undefined {
  const key = process.env.OACP_API_KEY?.trim();
  return key && key.length > 0 ? { 'x-api-key': key } : undefined;
}

async function main(): Promise<void> {
  const baseUrl = process.env.OACP_BASE_URL ?? 'http://127.0.0.1:3847';
  const headers = apiKeyHeaders();
  const client = createAgentClient(baseUrl, headers !== undefined ? { headers } : undefined);

  const health = await client.health();
  console.log('[custom-agents] Server:', health.status);

  await registerDevAgent(client, {
    id: COORDINATOR_ID,
    name: 'Custom Planner',
    capabilities: ['orchestrate', 'plan'],
    metadata: { fleet: FLEET, role: 'planner' },
  });

  await registerDevAgent(client, {
    id: WORKER_ID,
    name: 'Custom Worker',
    capabilities: ['work.echo'],
    metadata: { fleet: FLEET, role: 'worker' },
  });

  const traceId = createTraceId();

  const request = buildTaskRequest({
    from: COORDINATOR_ID,
    to: WORKER_ID,
    capability: 'work.echo',
    input: { value: 'Day 58 custom-agents trace' },
    traceId,
  });

  await client.send(request);

  const response = buildTaskResponse({
    from: WORKER_ID,
    inReplyTo: request.message_id,
    traceId,
    status: 'success',
    output: { echoed: 'Day 58 custom-agents trace', fleet: FLEET },
  });

  await client.send(response);

  const consoleUrl = buildConsoleTraceUrl(baseUrl, traceId, {
    mode: 'showcase',
    extraParams: { showcase_fleet: 'external' },
  });

  console.log('');
  console.log('[custom-agents] Trace complete');
  console.log('  trace_id:', traceId);
  console.log('  agents:   planner + worker (fleet:', FLEET + ')');
  console.log('  Console: ', consoleUrl);
  console.log('');
  console.log(
    'Tip: set VITE_OACP_CONSOLE_FLEETS=\'{"custom-demo":"Custom demo"}\' when building Console',
  );
  console.log('     to label custom fleets in the agent catalog.');
}

main().catch((error: unknown) => {
  console.error('[custom-agents] Fatal:', error);
  process.exit(1);
});
