# HTTP Reference Server

The `@oacp/server` package provides an enterprise-grade reference HTTP node for OACP
networking (Week 2, Day 8). It validates incoming messages, routes them through the
in-process message bus, and exposes agent lookup for registered identities.

**Package:** `server/` · **npm:** `@oacp/server`

## Architecture

```text
HTTP Client
    │ POST /send-message
    ▼
Fastify API ──validate──► @oacp/core MessageValidator
    │
    ▼
InMemoryMessageBus ──► locally registered agents (mailbox)
    │
    ▼
AgentRegistry ◄── GET /agent/:id
```

Each server node owns:

- An **in-memory message bus** (same as Week 1 local runtime)
- An **agent registry** for identities registered via `POST /agents`

Remote agents poll responses via `GET /agent/:id/messages` (Day 9). See [remote-client.md](./remote-client.md).

## Endpoints

### `GET /`

Root entry point for browsers and API discovery.

- **Browsers** (`Accept: text/html`) — `302` redirect to `/playground`
- **API clients** (`Accept: application/json`) — service index with UI and API paths

```json
{
  "ok": true,
  "service": "oacp-reference-server",
  "protocol_version": "0.1",
  "registered_agents": 6,
  "ui": { "playground": "/playground", "trace_viewer": "/trace-viewer" },
  "api": { "health": "/health", "agents": "/agents", "send_message": "/send-message" }
}
```

### `GET /health`

Liveness probe for load balancers and orchestrators.

```json
{
  "ok": true,
  "status": "healthy",
  "protocol_version": "0.1",
  "registered_agents": 2,
  "bus_open": true
}
```

### `POST /send-message`

Submit any OACP `v0.1` message. The body must be a complete protocol message.

**Success (200):**

```json
{
  "ok": true,
  "message_id": "550e8400-e29b-41d4-4716-446655440001",
  "trace_id": "0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b",
  "type": "task_request",
  "recipients": ["agent://summarizer"],
  "routing": {
    "mode": "capability",
    "capability": "text.summarize",
    "selected_agent": "agent://summarizer",
    "routing_mode": "first"
  }
}
```

When `to` is omitted, the server auto-routes by `capability` (Day 11). See [capability-routing.md](./capability-routing.md).

**Errors:**

| Status | Code                       | When                                     |
| ------ | -------------------------- | ---------------------------------------- |
| 400    | `SERVER_VALIDATION_FAILED` | JSON Schema / protocol validation failed |
| 404    | `SERVER_ROUTING_FAILED`    | No recipient for capability or `to`      |
| 503    | `SERVER_BUS_CLOSED`        | Message bus is closed                    |

### `GET /agent/:id`

Look up a registered agent. The `:id` parameter accepts:

- Short name: `summarizer` → `agent://summarizer`
- Full URI (URL-encoded): `agent%3A%2F%2Fsummarizer`

**Success (200):**

```json
{
  "ok": true,
  "agent": {
    "id": "agent://summarizer",
    "name": "Text Summarizer",
    "capabilities": ["text.summarize"],
    "version": "0.1",
    "publicKey": { "kty": "EC", "...": "..." }
  }
}
```

### `POST /agents`

Register an agent identity on this node (required before `GET /agent/:id`).

```json
{
  "identity": { "id": "agent://summarizer", "name": "...", "capabilities": [], "publicKey": {} },
  "replace": false
}
```

Registered agents are also enrolled on the local bus for capability routing.

### `GET /agents`

List all agents registered on this node.

Optional query parameters (Day 10):

| Param        | Description                                      |
| ------------ | ------------------------------------------------ |
| `capability` | Filter to agents declaring this capability       |
| `limit`      | Max results when filtering (1–100, default `10`) |

When `capability` is set, the response matches the discovery shape below.

### `GET /capabilities/:capability/agents`

Discover agents that declare a capability (Day 10). Query param `limit` (1–100, default `10`).

**Success (200):**

```json
{
  "ok": true,
  "capability": "text.summarize",
  "count": 1,
  "agents": [{ "id": "agent://summarizer", "capabilities": ["text.summarize"], "...": "..." }]
}
```

Returns `count: 0` when no agents match. Invalid capability ids return **400**
(`SERVER_VALIDATION_FAILED`).

### `GET /agent/:id/messages`

Pull the next message from an agent's mailbox (remote SDK polling). Query param `timeoutMs`
(default `5000`) controls server-side wait. Returns **204** when no message arrives.

```json
{
  "ok": true,
  "message": { "type": "task_response", "...": "..." }
}
```

## Memory API (Day 15)

Persistent task history. See [memory-system.md](./memory-system.md).

| Endpoint                      | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `GET /memory/scopes`          | List memory scopes                                         |
| `GET /memory/entries`         | Query entries (filters: `trace_id`, `kind`, `agent_id`, …) |
| `GET /memory/traces/:traceId` | All entries for a trace                                    |
| `GET /memory/entries/:id`     | Single entry by ID                                         |

Environment variables:

| Variable                   | Default           | Description                       |
| -------------------------- | ----------------- | --------------------------------- |
| `OACP_MEMORY_BACKEND`      | `memory`          | `memory`, `sqlite`, or `postgres` |
| `OACP_MEMORY_SQLITE_PATH`  | `.oacp/memory.db` | SQLite file path                  |
| `OACP_MEMORY_POSTGRES_URL` | —                 | PostgreSQL connection URL         |

## Delegation graph API (Day 16)

Structured delegation and subtask chains for a trace. See [delegation-graph.md](./delegation-graph.md).

### `GET /graph/traces/:traceId`

Returns nodes, edges, roots, leaves, and depth for the trace delegation graph.

```json
{
  "ok": true,
  "graph": {
    "trace_id": "0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b",
    "nodes": [{ "message_id": "...", "kind": "task_request", "agent_id": "agent://a" }],
    "edges": [{ "kind": "subtask", "from_message_id": "...", "to_message_id": "..." }],
    "roots": ["..."],
    "leaves": ["..."],
    "depth": 2
  }
}
```

Reconstructs from `MemoryStore` when the in-process recorder has no data (e.g. after cold start with SQLite/Postgres history).

## Trace observability API (Day 20)

Unified trace inspection for ops and debugging. See [observability.md](./observability.md).

| Endpoint               | Description                                   |
| ---------------------- | --------------------------------------------- |
| `GET /traces`          | List active traces (in-process bus)           |
| `GET /traces/:traceId` | Full trace bundle (messages, timeline, graph) |
| `GET /trace-viewer`    | Lightweight web UI                            |

## Playground API (Day 22)

Live agent graph and message flow visualization. See [playground.md](./playground.md).

| Endpoint                   | Description                           |
| -------------------------- | ------------------------------------- |
| `GET /playground`          | Self-contained web UI (live polling)  |
| `GET /playground/snapshot` | Unified poll payload (agents + trace) |

```
GET /playground/snapshot?trace_id=<uuid>&limit=25
```

Runnable demo:

```bash
pnpm --filter oacp-examples start:playground
```

## Workflow API (Day 18)

Registered DAG workflows and run history. See [workflow-engine.md](./workflow-engine.md).

### `GET /workflows`

Lists registered `WorkflowDefinition` records.

### `POST /workflows`

Registers a workflow definition (JSON body matches `WorkflowDefinition`).

### `POST /workflows/:workflowId/run`

Runs a registered workflow from the server coordinator runtime.

```json
{ "input": { "topic": "Q4 report" } }
```

Response includes `runId`, `traceId`, `output`, and per-step results.

### `GET /workflows/runs/:runId`

Returns persisted `WorkflowRunRecord` (status, steps, errors).

## Run locally

```bash
pnpm install
pnpm --filter @oacp/server build
pnpm --filter @oacp/server start
```

For HTTP workflow demos, preload workers and definitions:

```powershell
$env:OACP_DEV_WORKFLOWS = "1"
pnpm --filter @oacp/server start
```

Environment variables:

| Variable                       | Default           |
| ------------------------------ | ----------------- |
| `OACP_SERVER_HOST`             | `0.0.0.0`         |
| `OACP_SERVER_PORT`             | `3847`            |
| `OACP_DEV_WORKFLOWS`           | (off)             |
| `OACP_CAPABILITY_ROUTING_MODE` | `first`           |
| `OACP_MEMORY_BACKEND`          | `memory`          |
| `OACP_MEMORY_SQLITE_PATH`      | `.oacp/memory.db` |

Set `OACP_DEV_WORKFLOWS=1` to register `echo-workflow` and `document-dag` with in-process workers (local dev only).

## Programmatic usage

```typescript
import { createApp, startServer } from '@oacp/server';

// Testing — no listen
const { app, context } = createApp({ logger: false });
const response = await app.inject({
  method: 'POST',
  url: '/send-message',
  payload: taskRequest,
});

// Production — listen
const server = await startServer();
await server.close();
```

## Error format

All API errors return a consistent JSON envelope:

```json
{
  "error": {
    "code": "SERVER_VALIDATION_FAILED",
    "message": "Human-readable summary",
    "details": [{ "path": "/message_id", "message": "must match format \"uuid\"" }]
  }
}
```

## Related

- [Message bus](./message-bus.md) — routing semantics used inside the server
- [Integration testing](./integration-testing.md) — Week 1 local milestone
- [Registry design](./registry-design.md) — full discovery (Day 10+)
