/**
 * OACP Week 3 Day 19 — Failure recovery with alternate-agent failover.
 *
 * Primary summarizer fails; backup agent completes the task under one trace_id.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:recovery
 */
import {
  Agent,
  LocalBus,
  DEFAULT_TASK_RECOVERY_POLICY,
  createDelegationGraphRecorder,
  createTaskMemoryRecorder,
  createInMemoryMemoryStore,
} from '@oacp/sdk';

async function main(): Promise<void> {
  const bus = new LocalBus();
  const memoryStore = createInMemoryMemoryStore();
  const taskRecorder = createTaskMemoryRecorder(memoryStore);
  const graphRecorder = createDelegationGraphRecorder();

  const primary = new Agent({
    id: 'agent://summarizer-01-primary',
    name: 'summarizer-primary',
    capabilities: ['text.summarize'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: () => ({
      status: 'error',
      error: { code: 'SUMMARIZER_DOWN', message: 'Primary tier unavailable' },
    }),
  });

  const backup = new Agent({
    id: 'agent://summarizer-02-backup',
    name: 'summarizer-backup',
    capabilities: ['text.summarize'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      return { output: { summary: `Backup summary: ${text}`, tier: 'backup' } };
    },
  });

  const coordinator = new Agent({
    name: 'coordinator',
    capabilities: ['orchestrate.resilient'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
  });

  await Promise.all([primary.start(), backup.start(), coordinator.start()]);

  console.log('\n=== Failure Recovery (Day 19) ===\n');

  const outcome = await coordinator.agentRuntime.sendTaskWithRecovery(
    {
      capability: 'text.summarize',
      input: { text: 'enterprise failure recovery demo' },
    },
    { policy: DEFAULT_TASK_RECOVERY_POLICY },
  );

  if (!outcome.ok) {
    console.error('Recovery failed:', outcome.error.message);
    console.error('Attempts:', outcome.recoveryAttempts);
    process.exitCode = 1;
    return;
  }

  console.log('Selected agent:', outcome.selectedAgent);
  console.log('Recovery attempts:', outcome.recoveryAttempts.length);
  for (const attempt of outcome.recoveryAttempts) {
    console.log(`  #${attempt.attempt} ${attempt.agentId} → ${attempt.outcome}`);
  }
  console.log('Output:', outcome.response?.output);

  primary.stop();
  backup.stop();
  coordinator.stop();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
