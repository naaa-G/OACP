# Agent Runtime

The agent runtime wraps the in-process message bus with lifecycle management, task
handling, and correlated `task_response` delivery. Use it directly via `@oacp/core` or
through the ergonomic `Agent` class in `@oacp/sdk`.

**Module:** `core/src/runtime/` · **SDK:** `sdk/typescript/src/agent.ts`

## Quick start (SDK)

```typescript
import { Agent, LocalBus } from '@oacp/sdk';

const bus = new LocalBus();

const worker = new Agent({
  name: 'summarizer',
  capabilities: ['text.summarize'],
  bus,
  onTask: async (task) => ({
    output: { summary: `Done: ${task.input.text}` },
  }),
});

const coordinator = new Agent({
  name: 'coordinator',
  capabilities: ['orchestrate'],
  bus,
});

await Promise.all([worker.start(), coordinator.start()]);

const result = await coordinator.sendTask({
  capability: 'text.summarize',
  input: { text: 'Hello agents' },
});

console.log(result.output);
await Promise.all([worker.stop(), coordinator.stop()]);
```

## Core API (`AgentRuntime`)

```typescript
import { createAgentRuntime, createMessageBus, parseAgentIdentity } from '@oacp/core';

const bus = createMessageBus();
const identity = parseAgentIdentity(identityJson);

const runtime = createAgentRuntime({
  identity,
  bus,
  onTask: async (request, context) => {
    await context.respond({ output: { ok: true } });
    return { output: { ok: true } };
  },
});

await runtime.start();
const outcome = await runtime.sendTask({
  capability: 'text.summarize',
  input: { text: '...' },
});
await runtime.stop();
```

### Methods

| Method          | Description                                           |
| --------------- | ----------------------------------------------------- |
| `start()`       | Validate identity, register on bus                    |
| `stop()`        | Deregister and clear pending response waiters         |
| `sendTask()`    | Emit `task_request`, optionally await `task_response` |
| `receiveTask()` | Pull next task from mailbox (manual handling mode)    |
| `respond()`     | Send `task_response` for a received task              |
| `delegate()`    | Emit `delegation` for subtask routing (Day 6+)        |
| `sendSubTask()` | Chain to downstream agent; same `trace_id` (Day 13)   |

## Lifecycle

```text
CREATED ──start()──► RUNNING ──stop()──► STOPPED
```

Invalid transitions throw `OacpRuntimeError` with `RUNTIME_ALREADY_RUNNING` or
`RUNTIME_NOT_STARTED`.

## Task handling modes

### Automatic (default when `onTask` is set)

The runtime invokes `onTask`, then sends `task_response` automatically. Handler errors
produce a structured error response (`RUNTIME_TASK_HANDLER_FAILED`).

### Manual (`receiveTask` + `respond`)

```typescript
const worker = createAgentRuntime({
  identity,
  bus,
  autoHandleTasks: false,
  useMailbox: true,
});

await worker.start();
const task = await worker.receiveTask(30_000);
if (task) {
  await worker.respond(task, { output: { result: true } });
}
```

## `sendTask` correlation

When `waitForResponse` is `true` (default), the runtime:

1. Registers a pending waiter keyed by `message_id`
2. Sends the `task_request` through the bus
3. Resolves when a `task_response` with matching `in_reply_to` arrives
4. Returns `RUNTIME_RESPONSE_TIMEOUT` if the deadline elapses

## Execution context

`onTask` handlers receive an `ExecutionContext` with:

- `agentId`, `traceId`, `messageId`, `receivedAt`
- `respond(result)` — send `task_response` without calling runtime directly
- `delegate({ capability, input, to?, reason? })` — fire-and-forget delegation with preserved trace
- `executePlan(plan, options?)` — run a validated `SubtaskPlan` via `sendSubTask` (Day 17)
- `decomposeAndExecute({ planner, ... })` — plan and execute subtasks (Day 17)

See [multi-agent-pipeline.md](./multi-agent-pipeline.md) for A → B → C patterns, [delegation-graph.md](./delegation-graph.md) for graph recording, and [subtask-decomposition.md](./subtask-decomposition.md) for dependency-aware plans (Day 17).

### Delegation graph (Day 16)

Pass a shared `DelegationGraphRecorder` to each runtime in a collaboration:

```typescript
import { createDelegationGraphRecorder } from '@oacp/core';

const graphRecorder = createDelegationGraphRecorder();

const runtime = createAgentRuntime({
  identity,
  bus,
  delegationGraphRecorder: graphRecorder,
  taskRecorder, // optional — persists parent_message_id on subtasks
  onTask: async (task, ctx) => {
    const sub = await ctx.sendSubTask({ capability: 'downstream', input: task.input });
    return { output: sub.ok ? sub.response?.output : {} };
  },
});

const graph = await graphRecorder.getGraph(traceId);
```

## Error codes

| Code                           | When                                  |
| ------------------------------ | ------------------------------------- |
| `RUNTIME_NOT_STARTED`          | Operation before `start()`            |
| `RUNTIME_ALREADY_RUNNING`      | Duplicate `start()`                   |
| `RUNTIME_RESPONSE_TIMEOUT`     | No `task_response` within `timeoutMs` |
| `RUNTIME_TASK_HANDLER_FAILED`  | `onTask` threw an exception           |
| `RUNTIME_INVALID_TASK_MESSAGE` | `receiveTask` got a non-task message  |

## Message factories

Low-level helpers in `message-factory.ts` build protocol-compliant envelopes:

- `buildTaskRequest()`, `buildTaskResponse()`, `buildDelegation()`
- `createMessageId()`, `createTraceId()`

## Related

- [Message bus](./message-bus.md) — routing layer (Day 5)
- [Delegation graph](./delegation-graph.md) — who delegated what (Day 16)
- [Memory system](./memory-system.md) — persistent task history (Day 15)
- [Agent lifecycle](./agent-lifecycle.md) — registration and execution phases
- [Agent identity](./agent-identity.md) — identity validation on `start()`
