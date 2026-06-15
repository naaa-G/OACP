/**
 * OACP Week 3 Day 16 — task delegation graph.
 *
 * Coordinator → Orchestrator → Analyst via sendSubTask and explicit delegate().
 * Prints the delegation graph (nodes, edges, topological order).
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:graph
 */
import { Agent, LocalBus, createDelegationGraphRecorder } from '@oacp/sdk';
import { delegationTopologicalOrder } from '@oacp/core';

async function main(): Promise<void> {
  const bus = new LocalBus();
  const graphRecorder = createDelegationGraphRecorder();

  const analyst = new Agent({
    name: 'analyst',
    capabilities: ['analyze.text'],
    bus,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      return { output: { analysis: `Insights: ${text}` } };
    },
  });

  const orchestrator = new Agent({
    name: 'orchestrator',
    id: 'agent://orchestrator',
    capabilities: ['orchestrate.workflow'],
    bus,
    delegationGraphRecorder: graphRecorder,
    onTask: async (task, ctx) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';

      await ctx.delegate({
        capability: 'analyze.text',
        to: 'agent://analyst',
        input: { text },
        reason: 'Specialist analysis required',
      });

      const sub = await ctx.sendSubTask({
        capability: 'analyze.text',
        to: 'agent://analyst',
        input: { text: `${text} (via subtask)` },
      });

      if (!sub.ok || !sub.response) {
        throw new Error('Subtask failed');
      }

      return {
        output: {
          delegated: true,
          subtask: sub.response.output,
        },
      };
    },
  });

  const coordinator = new Agent({
    name: 'coordinator',
    capabilities: ['orchestrate'],
    bus,
    delegationGraphRecorder: graphRecorder,
  });

  await Promise.all([analyst.start(), orchestrator.start(), coordinator.start()]);

  const result = await coordinator.sendTask({
    capability: 'orchestrate.workflow',
    to: 'agent://orchestrator',
    input: { text: 'Quarterly revenue review' },
  });

  const graph = await graphRecorder.getGraph(result.request.trace_id);
  if (!graph) {
    console.error('No delegation graph recorded');
    process.exitCode = 1;
    return;
  }

  const order = delegationTopologicalOrder(graph);

  console.log('\n=== Delegation Graph (Day 16) ===\n');
  console.log(`trace_id: ${graph.trace_id}`);
  console.log(`depth: ${graph.depth}`);
  console.log(`roots: ${graph.roots.join(', ')}`);
  console.log(`topological order: ${order.join(' → ')}\n`);

  console.log('Nodes:');
  for (const node of graph.nodes) {
    console.log(
      `  - [${node.kind}] ${node.message_id.slice(0, 8)}… agent=${node.agent_id}` +
        (node.capability ? ` capability=${node.capability}` : ''),
    );
  }

  console.log('\nEdges:');
  for (const edge of graph.edges) {
    console.log(
      `  - ${edge.kind}: ${edge.from_message_id.slice(0, 8)}… → ${edge.to_message_id.slice(0, 8)}…` +
        (edge.capability ? ` (${edge.capability})` : ''),
    );
  }

  console.log('\nTask output:', result.output);

  analyst.stop();
  orchestrator.stop();
  coordinator.stop();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
