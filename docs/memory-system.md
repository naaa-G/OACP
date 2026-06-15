# Memory System

OACP Week 3 Day 15 — **persistent shared memory** for task history, decisions, and outputs.

## Purpose

Shared memory lets agent teams retain context across tasks:

- **Task history** — `task_request`, `task_response`, `delegation` messages
- **Outputs** — structured results keyed by `trace_id`
- **Decisions** — explicit agent decisions (`recordDecision`)

Memory is **scoped** per workflow (`workflow.trace.<trace_id>` by default) so teams do not leak context across unrelated work.

## Architecture

```text
AgentRuntime / HTTP server
        │
        ▼
 TaskMemoryRecorder  ──►  MemoryStore (port)
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              InMemory      SQLite      PostgreSQL
              (tests)       (local dev)  (production)
```

| Component             | Package        | Role                                          |
| --------------------- | -------------- | --------------------------------------------- |
| `MemoryStore`         | `@oacp/core`   | Port interface (append, query, listScopes)    |
| `TaskMemoryRecorder`  | `@oacp/core`   | Maps OACP messages → memory entries           |
| `MemoryScopeManager`  | `@oacp/core`   | Scope normalization and trace isolation       |
| `SqliteMemoryStore`   | `@oacp/server` | SQLite backend (default for reference server) |
| `PostgresMemoryStore` | `@oacp/server` | PostgreSQL backend for multi-node deploys     |

## Runtime usage

```typescript
import {
  createAgentRuntime,
  createInMemoryMemoryStore,
  createMessageBus,
  createTaskMemoryRecorder,
} from '@oacp/core';

const bus = createMessageBus();
const memoryStore = createInMemoryMemoryStore();
const taskRecorder = createTaskMemoryRecorder(memoryStore);

const worker = createAgentRuntime({
  identity: workerIdentity,
  bus,
  taskRecorder,
  onTask: async (task) => ({ output: { result: task.input } }),
});

const coordinator = createAgentRuntime({
  identity: coordinatorIdentity,
  bus,
  taskRecorder,
});

worker.start();
coordinator.start();

const outcome = await coordinator.sendTask({
  capability: 'analyze',
  input: { document: 'incident report' },
});

const history = await memoryStore.query({
  trace_id: outcome.ok ? outcome.request.trace_id : '',
});
```

Memory writes are **best-effort** — failures do not block task delivery.

## SDK usage

```typescript
import { Agent, LocalBus, createInMemoryMemoryStore, createTaskMemoryRecorder } from '@oacp/sdk';

const taskRecorder = createTaskMemoryRecorder(createInMemoryMemoryStore());

const agent = new Agent({
  name: 'worker',
  capabilities: ['echo'],
  bus: new LocalBus(),
  taskRecorder,
});
```

## Server configuration

| Variable                   | Default           | Description                                          |
| -------------------------- | ----------------- | ---------------------------------------------------- |
| `OACP_MEMORY_BACKEND`      | `sqlite`          | `memory`, `sqlite`, or `postgres`                    |
| `OACP_MEMORY_SQLITE_PATH`  | `.oacp/memory.db` | SQLite file path (parent dirs created automatically) |
| `OACP_MEMORY_POSTGRES_URL` | —                 | Required when backend is `postgres`                  |

```bash
# SQLite (default)
pnpm --filter @oacp/server start

# In-memory only (tests / ephemeral)
OACP_MEMORY_BACKEND=memory pnpm --filter @oacp/server start

# PostgreSQL
OACP_MEMORY_BACKEND=postgres \
OACP_MEMORY_POSTGRES_URL=postgres://user:pass@localhost:5432/oacp \
pnpm --filter @oacp/server start
```

## HTTP API

| Method | Path                      | Description                   |
| ------ | ------------------------- | ----------------------------- |
| GET    | `/memory/scopes`          | List distinct memory scopes   |
| GET    | `/memory/entries`         | Query entries (filter params) |
| GET    | `/memory/traces/:traceId` | History for one trace         |
| GET    | `/memory/entries/:id`     | Single entry by ID            |

Query parameters for `/memory/entries`:

- `scope`, `trace_id`, `agent_id`, `kind`, `capability`
- `since`, `until` (ISO timestamps)
- `limit` (default 100), `offset`

`POST /send-message` automatically records supported message types.

## Memory entry kinds

| Kind            | Source                                 |
| --------------- | -------------------------------------- |
| `task_request`  | Incoming / sent `task_request`         |
| `task_response` | `task_response` without output         |
| `output`        | Successful `task_response` with output |
| `delegation`    | `delegation` messages                  |
| `decision`      | `TaskMemoryRecorder.recordDecision()`  |

## Examples & tests

```bash
pnpm --filter oacp-examples start:memory
pnpm --filter @oacp/core test -- memory
pnpm --filter @oacp/server test -- memory
pnpm --filter @oacp/core test -- delegation-graph
pnpm --filter @oacp/core test -- subtask-plan
pnpm --filter oacp-examples start:graph
pnpm --filter oacp-examples start:workflow
```

Subtask parent links are stored in `task_request` payloads as `parent_message_id` for offline graph reconstruction. See [delegation-graph.md](./delegation-graph.md) and [subtask-decomposition.md](./subtask-decomposition.md).

## Planned (later weeks)

- `memory_share` message type and protocol schema
- Semantic / vector recall (`semantic-memory.ts`)

See [README roadmap](https://github.com/naaa-G/OACP#-roadmap) Milestone M3.
