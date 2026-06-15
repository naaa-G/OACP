/**
 * OACP Day 28 — LangChain adapter example.
 *
 * Demonstrates createOacpTool() against a running OACP server (no LLM API key needed).
 *
 * Run:
 *   pnpm oacp serve --bootstrap startup
 *   pnpm --filter oacp-examples start:langchain-delegate
 */
import { z } from 'zod';

import { createOacpTool } from '@oacp/integration-langchain';
import { createAgentClient, registerDevAgent } from '@oacp/sdk/client';

const CAPABILITY_CANDIDATES = [
  {
    capability: 'startup.plan',
    schema: z.object({ prompt: z.string() }),
    sample: { prompt: 'LangChain adapter connectivity check' },
  },
  {
    capability: 'text.summarize',
    schema: z.object({ text: z.string() }),
    sample: { text: 'Hello from LangChain OACP bridge.' },
  },
  {
    capability: 'work.echo',
    schema: z.object({ value: z.string() }),
    sample: { value: 'hello-langchain' },
  },
] as const;

async function main(): Promise<void> {
  const baseUrl = process.env.OACP_BASE_URL ?? 'http://127.0.0.1:3000';
  const client = createAgentClient(baseUrl);

  const health = await client.health();
  console.log(
    '[langchain] Server:',
    health.status,
    `(agents: ${String(health.registered_agents)})`,
  );

  await registerDevAgent(client, {
    id: 'agent://langchain-coordinator',
    name: 'LangChain Coordinator',
    capabilities: ['orchestrate'],
  });

  let selected = CAPABILITY_CANDIDATES[0];
  for (const candidate of CAPABILITY_CANDIDATES) {
    const workers = await client.findAgentsByCapability(candidate.capability);
    if (workers.length > 0) {
      selected = candidate;
      break;
    }
  }

  const workers = await client.findAgentsByCapability(selected.capability);
  if (workers.length === 0) {
    console.error('[langchain] No workers found. Start: pnpm oacp serve --bootstrap startup');
    process.exit(1);
  }

  console.log('[langchain] Capability:', selected.capability);

  const tool = createOacpTool({
    client,
    coordinatorId: 'agent://langchain-coordinator',
    capability: selected.capability,
    schema: selected.schema,
    description: `Delegate to OACP ${selected.capability} via LangChain StructuredTool`,
  });

  const raw = await tool.invoke(selected.sample);
  console.log('[langchain] Tool result:', raw);
}

main().catch((error: unknown) => {
  console.error('[langchain] Fatal error:', error);
  process.exit(1);
});
