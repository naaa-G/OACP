/**
 * OACP Week 3 Day 18 — DAG workflow engine.
 *
 * Registers a workflow definition and runs it via WorkflowEngine from a coordinator.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:workflow-engine
 */
import {
  Agent,
  LocalBus,
  WorkflowEngine,
  createDelegationGraphRecorder,
  createTaskMemoryRecorder,
  createInMemoryMemoryStore,
} from '@oacp/sdk';

async function main(): Promise<void> {
  const bus = new LocalBus();
  const memoryStore = createInMemoryMemoryStore();
  const taskRecorder = createTaskMemoryRecorder(memoryStore);
  const graphRecorder = createDelegationGraphRecorder();
  const engine = new WorkflowEngine();

  const summarizer = new Agent({
    name: 'summarizer',
    capabilities: ['text.summarize'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      return { output: { summary: `Report: ${text}` } };
    },
  });

  const analyzer = new Agent({
    name: 'analyzer',
    capabilities: ['analyze.text'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => {
      const tokens = Array.isArray(task.input.tokens) ? task.input.tokens : [];
      return { output: { analysis: tokens.join(' / ') } };
    },
  });

  const tokenizer = new Agent({
    name: 'tokenizer',
    capabilities: ['text.tokenize'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      return { output: { tokens: text.split(/\s+/).filter(Boolean) } };
    },
  });

  const coordinator = new Agent({
    name: 'coordinator',
    capabilities: ['orchestrate.workflow'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
  });

  engine.register({
    id: 'document-dag',
    name: 'Document Processing DAG',
    version: '1.0',
    description: 'Tokenize then analyze then summarize',
    steps: [
      {
        id: 'tokenize',
        capability: 'text.tokenize',
        input: { text: 'enterprise workflow engine demo' },
      },
      {
        id: 'analyze',
        capability: 'analyze.text',
        dependsOn: ['tokenize'],
        mapInput: (ctx) => ({
          tokens: ctx.getStepResult('tokenize')?.output?.tokens ?? [],
        }),
      },
      {
        id: 'summarize',
        capability: 'text.summarize',
        dependsOn: ['analyze'],
        mapInput: (ctx) => {
          const analysis = ctx.getStepResult('analyze')?.output?.analysis;
          return { text: typeof analysis === 'string' ? analysis : '' };
        },
      },
    ],
    reduceOutput: (ctx) => ({
      summary: ctx.getStepResult('summarize')?.output?.summary,
      steps: ctx.stepResults.size,
    }),
  });

  await Promise.all([summarizer.start(), analyzer.start(), tokenizer.start(), coordinator.start()]);

  console.log('\n=== DAG Workflow Engine (Day 18) ===\n');

  const result = await engine.run('document-dag', coordinator.agentRuntime, {});

  if (!result.ok) {
    console.error('Workflow failed:', result.error.message);
    process.exitCode = 1;
    return;
  }

  console.log('Run ID:', result.runId);
  console.log('Trace ID:', result.traceId);
  console.log('Steps completed:', result.steps.length);
  console.log('Output:', result.output);

  const graph = await graphRecorder.getGraph(result.traceId);
  if (graph) {
    console.log(`\nDelegation graph: ${graph.nodes.length} nodes, depth ${graph.depth}`);
  }

  const run = await engine.getRun(result.runId);
  console.log('Run status:', run?.status);

  summarizer.stop();
  analyzer.stop();
  tokenizer.stop();
  coordinator.stop();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
