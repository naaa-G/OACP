/**
 * OACP Week 3 Day 17 — multi-step workflow decomposition.
 *
 * Orchestrator agent plans subtasks (tokenize + classify in parallel, then analyze, summarize)
 * and executes them via `decomposeAndExecute`.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:workflow
 */
import {
  Agent,
  LocalBus,
  createDelegationGraphRecorder,
  createFunctionSubtaskPlanner,
  createTaskMemoryRecorder,
  createInMemoryMemoryStore,
} from '@oacp/sdk';

async function main(): Promise<void> {
  const bus = new LocalBus();
  const memoryStore = createInMemoryMemoryStore();
  const taskRecorder = createTaskMemoryRecorder(memoryStore);
  const graphRecorder = createDelegationGraphRecorder();

  const summarizer = new Agent({
    name: 'summarizer',
    capabilities: ['text.summarize'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      return { output: { summary: `Executive summary: ${text}` } };
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
      const category = typeof task.input.category === 'string' ? task.input.category : 'general';
      return {
        output: {
          analysis: `${category} insights for: ${tokens.join(', ')}`,
        },
      };
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
      return { output: { tokens: text.toLowerCase().split(/\s+/).filter(Boolean) } };
    },
  });

  const classifier = new Agent({
    name: 'classifier',
    capabilities: ['text.classify'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      const category = text.includes('revenue') ? 'finance' : 'general';
      return { output: { category } };
    },
  });

  const orchestrator = new Agent({
    name: 'orchestrator',
    id: 'agent://orchestrator',
    capabilities: ['orchestrate.decompose'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: async (task, ctx) => {
      const topic = typeof task.input.topic === 'string' ? task.input.topic : '';

      const planner = createFunctionSubtaskPlanner(() => ({
        metadata: { strategy: 'research-pipeline' },
        steps: [
          {
            id: 'tokenize',
            capability: 'text.tokenize',
            input: { text: topic },
            reason: 'Extract keywords for downstream analysis',
          },
          {
            id: 'classify',
            capability: 'text.classify',
            input: { text: topic },
            reason: 'Determine domain for specialized analysis',
          },
          {
            id: 'analyze',
            capability: 'analyze.text',
            dependsOn: ['tokenize', 'classify'],
            mapInput: (planCtx) => ({
              tokens: planCtx.getStepResult('tokenize')?.output?.tokens ?? [],
              category: planCtx.getStepResult('classify')?.output?.category ?? 'general',
            }),
          },
          {
            id: 'summarize',
            capability: 'text.summarize',
            dependsOn: ['analyze'],
            mapInput: (planCtx) => ({
              text: String(planCtx.getStepResult('analyze')?.output?.analysis ?? ''),
            }),
          },
        ],
        reduceOutput: (planCtx) => ({
          topic,
          category: planCtx.getStepResult('classify')?.output?.category,
          summary: planCtx.getStepResult('summarize')?.output?.summary,
          stepCount: planCtx.stepResults.size,
        }),
      }));

      await taskRecorder.recordDecision({
        trace_id: ctx.traceId,
        agent_id: ctx.agentId,
        decision: `Decomposed topic "${topic}" into 4 subtasks`,
        metadata: { capability: task.capability },
      });

      const result = await ctx.decomposeAndExecute({
        planner,
        onStepComplete: (step) => {
          console.log(`  ✓ step ${step.stepId} (${step.capability}) → ${step.status}`);
        },
      });

      if (!result.ok) {
        return {
          status: 'error',
          error: { code: 'WORKFLOW_FAILED', message: result.error.message },
        };
      }

      return { output: result.output };
    },
  });

  const coordinator = new Agent({
    name: 'coordinator',
    capabilities: ['orchestrate'],
    bus,
    taskRecorder,
    delegationGraphRecorder: graphRecorder,
  });

  await Promise.all([
    summarizer.start(),
    analyzer.start(),
    tokenizer.start(),
    classifier.start(),
    orchestrator.start(),
    coordinator.start(),
  ]);

  console.log('\n=== Subtask Decomposition (Day 17) ===\n');

  const result = await coordinator.sendTask({
    capability: 'orchestrate.decompose',
    to: 'agent://orchestrator',
    input: { topic: 'Quarterly revenue growth trends' },
  });

  console.log('\nFinal output:', result.output);

  const graph = await graphRecorder.getGraph(result.request.trace_id);
  if (graph) {
    console.log(`\nDelegation graph: ${graph.nodes.length} nodes, depth ${graph.depth}`);
  }

  const history = await memoryStore.query({ trace_id: result.request.trace_id });
  console.log(`Memory entries recorded: ${history.length}`);

  summarizer.stop();
  analyzer.stop();
  tokenizer.stop();
  classifier.stop();
  orchestrator.stop();
  coordinator.stop();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
