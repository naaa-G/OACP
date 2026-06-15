# Agent Lifecycle

> **Status:** Identity, bus registration, discovery, and runtime execution complete (Day 6).

## States

```text
  ┌──────────┐    start()    ┌─────────┐
  │ CREATED  │ ────────────► │ RUNNING │
  └──────────┘               └────┬────┘
                                  │ stop()
                                  ▼
                             ┌─────────┐
                             │ STOPPED │
                             └─────────┘
```

## Lifecycle phases

| Phase            | Description                                                  | Status |
| ---------------- | ------------------------------------------------------------ | :----: |
| **Identity**     | Agent defines `id`, `name`, `capabilities`, `publicKey`      |   ✅   |
| **Declaration**  | Agent publishes capability registry with rich metadata       |   ✅   |
| **Permissions**  | Agent declares invoke/delegate/memory scopes (optional)      |   ✅   |
| **Registration** | Agent registers identity + capabilities with bus or registry |   ✅   |
| **Discovery**    | Other agents query capabilities via `capability_query`       |   ✅   |
| **Execution**    | Agent receives `task_request`, returns `task_response`       |   ✅   |
| **Delegation**   | Agent emits `delegation` messages for subtasks               |   ✅   |
| **Shutdown**     | Agent deregisters and stops accepting tasks                  |   ✅   |

## Day 3 — Identity & capabilities

Before an agent can join a network, it must:

1. **Define identity** — validate with `parseAgentIdentity()`.
2. **Publish declarations** — validate registry with `parseCapabilityRegistry()`.
3. **Ensure consistency** — identity `capabilities[]` must match declaration IDs.
4. **Optional permissions** — validate with `parseAgentPermissions()`.

See [agent-identity.md](./agent-identity.md) for API reference and examples.

## Day 5 — Bus registration & discovery

Agents join an in-process collaboration by registering on the message bus:

```typescript
import { createMessageBus } from '@oacp/core';

const bus = createMessageBus();

bus.register('agent://summarizer', handler, { capabilities: ['text.summarize'] });
bus.register('agent://registry', registryHandler);
```

- **Direct routing** — set `to` on `task_request` / `delegation`.
- **Capability routing** — omit `to`; bus resolves the first matching agent.
- **Discovery** — `capability_query` routes to `agent://registry` by convention.
- **Tracing** — all messages indexed by `trace_id` for correlation.

Full API: [message-bus.md](./message-bus.md).

## Runtime API (Day 6) ✅

```typescript
import { Agent, LocalBus } from '@oacp/sdk';

const bus = new LocalBus();
const agent = new Agent({
  name: 'worker',
  capabilities: ['echo'],
  bus,
  onTask: async (t) => ({ output: t.input }),
});

await agent.start();
const result = await agent.sendTask({ capability: 'echo', input: { message: 'hi' } });
await agent.stop();
```

Implementation: `core/src/runtime/agent-runtime.ts` · Full reference: [agent-runtime.md](./agent-runtime.md).

## Heartbeats (Week 2)

Running agents emit periodic `heartbeat` messages for liveness detection by the registry.

See the [README roadmap](https://github.com/naaa-G/OACP#-roadmap) for the full timeline.
