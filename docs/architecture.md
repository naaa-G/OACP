# Architecture

OACP is organized as a layered monorepo. Each layer has a clear responsibility and
dependency direction: **specs → core → SDK/server → applications**.

## Layer diagram

```text
┌──────────────────────────────────────────────────────────────┐
│                    Applications & Demos                         │
│         playground/ · examples/ · CLI (tools/cli/)            │
└───────────────────────────────┬──────────────────────────────┘
                                │ uses
┌───────────────────────────────▼──────────────────────────────┐
│                      Client SDKs (@oacp/sdk)                    │
│              TypeScript (primary) · Python · Rust               │
└───────────────────────────────┬──────────────────────────────┘
                                │ uses
┌───────────────────────────────▼──────────────────────────────┐
│                    Protocol Engine (@oacp/core)                 │
│  protocol/ · routing/ · security/ · runtime/ · memory/         │
└───────────────────────────────┬──────────────────────────────┘
                                │ validates against
┌───────────────────────────────▼──────────────────────────────┐
│                   Specs (JSON Schema — source of truth)         │
│              messages/ · agent/ · registry/                     │
└────────────────────────────────────────────────────────────────┘

        Optional network layer (Week 2+):
┌──────────────────────────────────────────────────────────────┐
│                    Reference Server (server/)                   │
│     HTTP/gRPC API · Registry · Orchestrator · Storage           │
└──────────────────────────────────────────────────────────────┘
```

## Package boundaries

### `specs/`

Canonical JSON Schemas for all protocol messages, agent identity, and registry records.
**No runtime code** — schemas are the contract. SDK and core implementations must conform.

### `@oacp/core`

Language-agnostic protocol engine implemented in TypeScript:

| Module           | Responsibility                          | Week 1 status |
| ---------------- | --------------------------------------- | :-----------: |
| `protocol/`      | Schema validation, versioning, errors   | ✅ Day 4 done |
| `routing/`       | Message bus, router, trace store        | ✅ Day 5 done |
| `runtime/`       | Agent lifecycle, execution context      | ✅ Day 6 done |
| `security/`      | Auth, signatures, permissions           |    Planned    |
| `memory/`        | Shared memory, task history persistence |  Day 15 done  |
| `observability/` | Structured logging, trace bundles       |  Day 20 done  |

### `@oacp/sdk`

Thin, ergonomic API for agent authors. Re-exports and wraps `@oacp/core` primitives.

| API surface   | Use case                                      |  Status   |
| ------------- | --------------------------------------------- | :-------: |
| `Agent`       | Local in-process agent with `onTask` handlers | ✅ Day 6  |
| `LocalBus`    | Shared message bus for co-located agents      | ✅ Day 5  |
| `AgentClient` | Remote HTTP client for `@oacp/server` nodes   | ✅ Day 9  |
| Discovery     | `findAgentsByCapability`, `listAgents`        | ✅ Day 10 |
| Auto-routing  | `sendTask` without `to` over HTTP             | ✅ Day 11 |

### `@oacp/server` (Day 8+)

Reference network node exposing HTTP endpoints for remote agent messaging and agent lookup.
Uses `@oacp/core` message bus and validation internally.

| Endpoint                                  |  Status   |
| ----------------------------------------- | :-------: |
| `POST /send-message`                      | ✅ Day 8  |
| `GET /agent/:id`                          | ✅ Day 8  |
| `POST /agents`                            | ✅ Day 8  |
| `GET /agent/:id/messages`                 | ✅ Day 9  |
| `GET /capabilities/:capability/agents`    | ✅ Day 10 |
| `GET /health`                             | ✅ Day 8  |
| `GET /traces`, `GET /trace-viewer`        | ✅ Day 20 |
| `GET /playground`, `/playground/snapshot` | ✅ Day 22 |
| Remote client SDK                         | ✅ Day 9  |

### `playground/` (Day 22)

Live web visualization served by `@oacp/server` at `GET /playground`. See [playground.md](./playground.md).

## Design principles

1. **Spec-first** — change schemas before code; version explicitly.
2. **Strict types** — TypeScript strict mode across all packages.
3. **Minimal surface** — small public APIs; internal modules stay internal.
4. **Test at boundaries** — validate messages, routing, and integration flows.
5. **Interoperate** — bridge to MCP/A2A rather than replace them.

## Dependency rules

- `specs/` has no code dependencies.
- `@oacp/core` may read schemas from `specs/` at build or runtime.
- `@oacp/sdk` depends on `@oacp/core` only (no circular deps).
- `server/`, `playground/`, and `examples/` depend on SDK and/or core.
- Integration adapters (`integrations/`) wrap external frameworks; they do not belong in core.

## Current state (Day 29)

- Week 1–3 milestones complete (M1–M3). Week 4 adoption layer in progress (M4).
- **Launch kit** — architecture SVG, demo video script, screenshot guide, launch-day playbook.
- **Integration adapters** — LangChain (`@oacp/integration-langchain`) and AutoGen (`oacp-autogen`).
- **Demo v1** (`examples/demo-v1/`) — remote coordinator + document pipeline over HTTP.
- **Demo v2** (`examples/demo-v2/`) — DAG workflow with memory, graph, recovery, and traces.
- Run: `pnpm --filter oacp-examples start:demo-v2` — see [demo-v2.md](./demo-v2.md).

See [development.md](./development.md) for setup and the [README roadmap](https://github.com/naaa-G/OACP#-roadmap) for milestones.
