# Basic Agent Flow

> **Status:** ✅ Verified by Day 7 integration tests and runnable example.

This example demonstrates the smallest multi-agent interaction:

1. Create two agents on a local message bus.
2. Agent A sends a `task_request` to Agent B's capability.
3. Agent B responds with a `task_response`.

## Runnable code

```typescript
import { Agent, LocalBus } from '@oacp/sdk';

const bus = new LocalBus();

const worker = new Agent({
  name: 'worker',
  capabilities: ['echo'],
  bus,
  onTask: async (task) => ({ output: task.input }),
});

const coordinator = new Agent({
  name: 'coordinator',
  capabilities: ['orchestrate'],
  bus,
});

worker.start();
coordinator.start();

const result = await coordinator.sendTask({
  capability: 'echo',
  input: { message: 'hello' },
});

console.log(result.output);
```

Formal verification: [integration-testing.md](../integration-testing.md).

Runnable script: [`examples/multi-agent/hello-agents.ts`](../../examples/multi-agent/hello-agents.ts).

See [agent-runtime.md](../agent-runtime.md), [development.md](../development.md), and the [README roadmap](https://github.com/naaa-G/OACP#-roadmap).
