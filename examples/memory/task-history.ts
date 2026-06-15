/**
 * OACP Week 3 Day 15 — persistent task history via shared memory store.
 *
 * Two agents exchange a task; history is written to the in-process memory store
 * and queried by trace_id.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:memory
 */
import { Agent, LocalBus, createInMemoryMemoryStore, createTaskMemoryRecorder } from '@oacp/sdk';

async function main(): Promise<void> {
  const bus = new LocalBus();
  const memoryStore = createInMemoryMemoryStore();
  const taskRecorder = createTaskMemoryRecorder(memoryStore);

  const worker = new Agent({
    name: 'worker',
    capabilities: ['text.uppercase'],
    bus,
    taskRecorder,
    onTask: (task) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      return { output: { text: text.toUpperCase() } };
    },
  });

  const coordinator = new Agent({
    name: 'coordinator',
    capabilities: ['orchestrate'],
    bus,
    taskRecorder,
  });

  await Promise.all([worker.start(), coordinator.start()]);

  const result = await coordinator.sendTask({
    capability: 'text.uppercase',
    input: { text: 'persistent task history' },
  });

  if (result.status !== 'success') {
    console.error('Task failed:', result);
    process.exit(1);
  }

  const traceId = result.request.trace_id;
  const history = await memoryStore.query({ trace_id: traceId });

  console.log('Task output:', result.output);
  console.log('Trace ID:', traceId);
  console.log(`Memory entries (${history.length}):`);
  for (const entry of history) {
    console.log(`  [${entry.kind}] ${entry.agent_id} @ ${entry.created_at}`);
  }

  await memoryStore.close();
  await Promise.all([worker.stop(), coordinator.stop()]);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
