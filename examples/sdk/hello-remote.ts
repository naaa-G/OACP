/**
 * OACP SDK example — remote HTTP client with dev agent registration.
 *
 * Run against a running server (startup team or demo workers):
 *   pnpm oacp serve --bootstrap startup
 *   pnpm --filter oacp-examples start:sdk-remote
 */
import { createAgentClient, registerDevAgent } from '@oacp/sdk/client';
import type { AgentClient } from '@oacp/sdk/client';

const CAPABILITY_CANDIDATES = [
  {
    capability: 'text.summarize',
    input: { text: 'Hello from @oacp/sdk remote example.' },
  },
  {
    capability: 'startup.plan',
    input: { prompt: 'SDK remote connectivity check' },
  },
  {
    capability: 'work.echo',
    input: { value: 'hello-sdk' },
  },
] as const;

async function pickTask(client: AgentClient): Promise<{
  capability: string;
  input: Record<string, unknown>;
}> {
  const override = process.env.OACP_CAPABILITY;
  if (override) {
    const match = CAPABILITY_CANDIDATES.find((c) => c.capability === override);
    return match ?? { capability: override, input: { text: 'Hello from SDK.' } };
  }

  for (const candidate of CAPABILITY_CANDIDATES) {
    const workers = await client.findAgentsByCapability(candidate.capability);
    if (workers.length > 0) {
      return { capability: candidate.capability, input: { ...candidate.input } };
    }
  }

  throw new Error(
    'No suitable worker on server. Start with:\n' +
      '  pnpm oacp serve --bootstrap startup\n' +
      '  pnpm oacp serve --bootstrap demo',
  );
}

async function main(): Promise<void> {
  const baseUrl = process.env.OACP_BASE_URL ?? 'http://127.0.0.1:3000';
  const client = createAgentClient(baseUrl);

  const health = await client.health();
  console.log(
    '[sdk] Server health:',
    health.status,
    `(agents: ${String(health.registered_agents)})`,
  );

  await registerDevAgent(client, {
    id: 'agent://sdk-coordinator',
    name: 'SDK Coordinator',
    capabilities: ['orchestrate'],
  });

  const { capability, input } = await pickTask(client);
  console.log('[sdk] Using capability:', capability);

  const result = await client.sendTask({
    from: 'agent://sdk-coordinator',
    capability,
    input,
  });

  console.log('[sdk] Task status:', result.status);
  console.log('[sdk] Output:', result.output);
  console.log('[sdk] Trace ID:', result.request.trace_id);
}

main().catch((error: unknown) => {
  console.error('[sdk] Fatal error:', error);
  process.exit(1);
});
