/**
 * OACP Week 2 Day 13 — multi-agent pipeline A → B → C.
 *
 * Orchestrator (A) → Transformer (B) → Summarizer (C) via sendSubTask.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:pipeline
 */
import { Agent, LocalBus } from '@oacp/sdk';

async function main(): Promise<void> {
  const bus = new LocalBus();

  const summarizer = new Agent({
    name: 'summarizer',
    capabilities: ['text.summarize'],
    bus,
    onTask: (task) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      return { output: { summary: `Final: ${text}` } };
    },
  });

  const transformer = new Agent({
    name: 'transformer',
    capabilities: ['text.transform'],
    bus,
    onTask: async (task, ctx) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      const normalized = text.trim().toUpperCase();
      const sub = await ctx.sendSubTask({
        capability: 'text.summarize',
        input: { text: normalized },
      });
      if (!sub.ok || !sub.response) {
        throw new Error('Downstream summarize failed');
      }
      return {
        output: {
          transformed: normalized,
          summary: sub.response.output?.summary,
        },
      };
    },
  });

  const orchestrator = new Agent({
    name: 'orchestrator',
    id: 'agent://orchestrator',
    capabilities: ['orchestrate.pipeline'],
    bus,
    onTask: async (task, ctx) => {
      const text = typeof task.input.text === 'string' ? task.input.text : '';
      const sub = await ctx.sendSubTask({
        capability: 'text.transform',
        input: { text },
      });
      if (!sub.ok || !sub.response) {
        throw new Error('Downstream transform failed');
      }
      return { output: sub.response.output };
    },
  });

  const coordinator = new Agent({
    name: 'coordinator',
    capabilities: ['orchestrate'],
    bus,
  });

  summarizer.start();
  transformer.start();
  orchestrator.start();
  coordinator.start();

  const result = await coordinator.sendTask({
    capability: 'orchestrate.pipeline',
    to: 'agent://orchestrator',
    input: { text: '  hello pipeline chain  ' },
  });

  console.log('Pipeline status:', result.status);
  console.log('Output:', result.output);
  console.log('Trace ID:', result.request.trace_id);

  summarizer.stop();
  transformer.stop();
  orchestrator.stop();
  coordinator.stop();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
