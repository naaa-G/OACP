# Multi-Agent Pipeline

OACP Week 2 Day 13 — chain execution **A → B → C** with shared `trace_id` correlation.

## Patterns

### 1. Agent chain (`sendSubTask`)

Each agent handles one hop and calls the next via `ExecutionContext.sendSubTask()`:

```typescript
const orchestrator = createAgentRuntime({
  identity: { id: 'agent://orchestrator', /* … */ capabilities: ['orchestrate.pipeline'] },
  bus,
  onTask: async (task, ctx) => {
    const sub = await ctx.sendSubTask({
      capability: 'text.transform',
      input: { text: String(task.input.text ?? '') },
    });
    if (!sub.ok || !sub.response) {
      return { status: 'error', error: { code: 'CHAIN', message: 'downstream failed' } };
    }
    const output = sub.response.output;
    if (!output) {
      return { status: 'error', error: { code: 'CHAIN', message: 'empty downstream output' } };
    }
    return { output };
  },
});
```

`sendSubTask` preserves the parent `trace_id` so the full chain appears in one trace.

### 2. Declarative pipeline (`runPipeline`)

For coordinator-driven sequential steps without custom agent logic per hop:

```typescript
import { createAgentRuntime, createMessageBus, runPipeline } from '@oacp/core';

const bus = createMessageBus();
const coordinator = createAgentRuntime({ identity: coordinatorIdentity, bus });
coordinator.start();

const result = await runPipeline(
  coordinator,
  [
    {
      id: 'extract',
      capability: 'text.extract',
      mapInput: (ctx) => ({ raw: ctx.initialInput.raw }),
    },
    {
      id: 'transform',
      capability: 'text.transform',
      mapInput: (ctx) => ({ text: ctx.getStepResult('extract')?.output?.text }),
    },
    {
      id: 'summarize',
      capability: 'text.summarize',
      mapInput: (ctx) => ({ text: ctx.getStepResult('transform')?.output?.text }),
    },
  ],
  { raw: 'RAW: input data' },
);

console.log(result.output);
```

`TaskPipeline` wraps the same API with lifecycle helpers.

## Remote (HTTP)

Workers run on `@oacp/server`; coordinators use `AgentClient.sendTask()` to start the chain:

```typescript
const result = await client.sendTask({
  from: 'agent://coordinator',
  capability: 'orchestrate.pipeline',
  to: 'agent://orchestrator',
  input: { text: 'article body' },
});
```

In-process workers on the server bus use `sendSubTask` identically to local agents.

## Trace observability

```typescript
const messages = bus.getMessagesForTrace(traceId);
// task_request / task_response pairs for each hop
```

Week 3 adds a persisted [delegation graph](./delegation-graph.md) (Day 16) and [subtask decomposition](./subtask-decomposition.md) (Day 17); Day 13 uses the in-process trace store.

## Subtask decomposition (Day 17)

When an **orchestrator agent** must break work into dependent subtasks (including parallel steps), use `SubtaskPlan` and `ctx.executePlan()` instead of hand-written `sendSubTask` chains. See [subtask-decomposition.md](./subtask-decomposition.md).

```bash
pnpm --filter oacp-examples start:workflow
```

## Error handling

| Failure            | Behaviour                                        |
| ------------------ | ------------------------------------------------ |
| Downstream timeout | `sendSubTask` returns `ok: false`                |
| Handler error      | Agent responds with `task_response` status error |
| `runPipeline` step | Stops at failed step; returns `failedStepId`     |

## Runnable example

```bash
pnpm --filter oacp-examples start:pipeline
```

See [examples/pipeline/README.md](../examples/pipeline/README.md).

## Related

- [Agent runtime](./agent-runtime.md) — `sendTask`, `respond`, lifecycle
- [Subtask decomposition](./subtask-decomposition.md) — DAG plans with `dependsOn` (Day 17)
- [Capability routing](./capability-routing.md) — auto-route without `to`
- [Reliable delivery](./reliable-delivery.md) — HTTP retries
- [Integration testing](./integration-testing.md)
