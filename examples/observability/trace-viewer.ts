/**
 * OACP Week 3 Day 20 — logging + trace viewer.
 *
 * Runs a local multi-agent flow with structured logging, then prints the trace timeline.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:trace
 */
import {
  Agent,
  LocalBus,
  createConsoleLogger,
  createDelegationGraphRecorder,
  createTaskMemoryRecorder,
  createInMemoryMemoryStore,
  formatTraceTimeline,
  buildTraceBundleFromRecord,
} from '@oacp/sdk';

async function main(): Promise<void> {
  const logger = createConsoleLogger({ level: 'info', json: process.env.OACP_LOG_JSON === '1' });
  const bus = new LocalBus();
  const memoryStore = createInMemoryMemoryStore();
  const taskRecorder = createTaskMemoryRecorder(memoryStore);
  const graphRecorder = createDelegationGraphRecorder();

  const worker = new Agent({
    name: 'worker',
    capabilities: ['text.transform'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
    logger,
    onTask: (task) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      return { output: { result: text.toUpperCase() } };
    },
  });

  const coordinator = new Agent({
    name: 'coordinator',
    capabilities: ['orchestrate.trace'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
    logger,
  });

  await Promise.all([worker.start(), coordinator.start()]);

  console.log('\n=== Observability (Day 20) ===\n');

  const result = await coordinator.sendTask({
    capability: 'text.transform',
    input: { text: 'hello observability' },
  });

  if (result.status !== 'success' || !result.response) {
    console.error('Task failed');
    process.exitCode = 1;
    return;
  }

  const traceId = result.request.trace_id;
  const record = bus.getTrace(traceId);
  if (!record) {
    console.error('Trace not found in bus');
    process.exitCode = 1;
    return;
  }

  const graph = await graphRecorder.getGraph(traceId);
  const bundle = buildTraceBundleFromRecord(record, { graph });

  console.log(`\nTrace ID: ${traceId}`);
  console.log(formatTraceTimeline(bundle.timeline, { graph: bundle.graph }));
  console.log('\nTip: with a running server, open GET /trace-viewer or run:');
  console.log(`  pnpm --filter @oacp/server trace -- ${traceId}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
