/**
 * OACP Week 2 milestone — remote agent example (Day 9).
 *
 * Starts an in-process OACP server with a summarizer worker, then uses
 * AgentClient over HTTP as a remote coordinator.
 *
 * Run after building packages:
 *   pnpm build
 *   npx tsx examples/remote-agent/hello-remote.ts
 */
import { createApp } from '@oacp/server';
import { AgentClient, DEFAULT_DEV_PUBLIC_KEY, createAgentRuntime } from '@oacp/sdk';

async function main(): Promise<void> {
  const { app, context } = createApp({ logger: false });

  await app.inject({
    method: 'POST',
    url: '/agents',
    payload: {
      identity: {
        id: 'agent://summarizer',
        name: 'Summarizer',
        version: '0.1',
        capabilities: ['text.summarize'],
        publicKey: DEFAULT_DEV_PUBLIC_KEY,
      },
    },
  });

  const worker = createAgentRuntime({
    identity: {
      id: 'agent://summarizer',
      name: 'Summarizer',
      version: '0.1',
      capabilities: ['text.summarize'],
      publicKey: DEFAULT_DEV_PUBLIC_KEY,
    },
    bus: context.bus,
    onTask: (task) => {
      const text =
        task.type === 'task_request' && typeof task.input.text === 'string' ? task.input.text : '';
      return { output: { summary: `Remote: ${text}` } };
    },
  });
  worker.start();

  const baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });

  try {
    const client = new AgentClient({ baseUrl, timeoutMs: 10_000 });

    await client.registerAgent({
      id: 'agent://coordinator',
      name: 'Coordinator',
      version: '0.1',
      capabilities: ['orchestrate'],
      publicKey: DEFAULT_DEV_PUBLIC_KEY,
    });

    const result = await client.sendTask({
      from: 'agent://coordinator',
      capability: 'text.summarize',
      input: { text: 'Hello from the OACP remote agent example.' },
      responseTimeoutMs: 10_000,
    });

    console.log('Server:', baseUrl);
    console.log('Task status:', result.status);
    console.log('Output:', result.output);
    console.log('Trace ID:', result.request.trace_id);
    console.log('Responded by:', result.response?.from);
  } finally {
    worker.stop();
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
