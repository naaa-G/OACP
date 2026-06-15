/**
 * OACP Week 1 milestone — hello agents example.
 *
 * Run after building packages:
 *   pnpm build
 *   node --import tsx examples/multi-agent/hello-agents.ts
 *
 * Or run the integration test suite:
 *   pnpm --filter @oacp/core test -- tests/integration
 */
import { Agent, LocalBus } from '@oacp/sdk';

async function main(): Promise<void> {
  const bus = new LocalBus();

  const summarizer = new Agent({
    name: 'summarizer',
    capabilities: ['text.summarize'],
    bus,
    onTask: (task) => {
      const text =
        task.type === 'task_request' && typeof task.input.text === 'string' ? task.input.text : '';
      return { output: { summary: `Summary: ${text}` } };
    },
  });

  const coordinator = new Agent({
    name: 'coordinator',
    capabilities: ['orchestrate'],
    bus,
  });

  summarizer.start();
  coordinator.start();

  const result = await coordinator.sendTask({
    capability: 'text.summarize',
    input: { text: 'Hello from the OACP multi-agent example.' },
  });

  console.log('Task status:', result.status);
  console.log('Output:', result.output);
  console.log('Trace ID:', result.request.trace_id);

  summarizer.stop();
  coordinator.stop();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
