# Message Types

Reference for OACP `v0.1` message types. Schemas are the source of truth in [`specs/`](../specs/).

## Overview

| Type               | Direction          | Summary                                      | Status |
| ------------------ | ------------------ | -------------------------------------------- | :----: |
| `task_request`     | Client → Agent     | Ask an agent (or capability) to perform work |   ✅   |
| `task_response`    | Agent → Client     | Return output or structured error            |   ✅   |
| `delegation`       | Agent → Agent      | Hand off a subtask and track the chain       |   ✅   |
| `capability_query` | Any → Registry/Bus | Find agents matching a capability            |   ✅   |
| `memory_share`     | Agent → Agent      | Share scoped memory/context                  |   ⚪   |
| `heartbeat`        | Agent → Registry   | Signal liveness                              |   ⚪   |

Examples: [`specs/examples/`](../specs/examples/).

---

## Common envelope

All messages include:

| Field        | Type              | Required | Description                            |
| ------------ | ----------------- | :------: | -------------------------------------- |
| `type`       | string            |    ✅    | Message type discriminator             |
| `version`    | string            |    ✅    | Protocol version (`"1.0"`)             |
| `message_id` | string (UUID)     |    ✅    | Unique ID for this message             |
| `trace_id`   | string (UUID)     |    ✅    | Correlation ID for distributed tracing |
| `from`       | string (URI)      |    ✅    | Sender agent URI (`agent://…`)         |
| `timestamp`  | string (ISO 8601) |    ✅    | Message creation time (UTC)            |

---

## `task_request`

Ask an agent or capability to perform work.

**Schema:** [`specs/messages/task_request.json`](../specs/messages/task_request.json)

| Field         | Type    | Required | Description                                            |
| ------------- | ------- | :------: | ------------------------------------------------------ |
| `capability`  | string  |    ✅    | Target capability (e.g. `text.summarize`)              |
| `input`       | object  |    ✅    | Task payload (arbitrary JSON)                          |
| `to`          | URI     |    —     | Optional direct recipient; omit for capability routing |
| `deadline_ms` | integer |    —     | Optional deadline in ms (1–86400000)                   |

```json
{
  "type": "task_request",
  "version": "1.0",
  "message_id": "550e8400-e29b-41d4-a716-446655440001",
  "trace_id": "0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b",
  "from": "agent://coordinator",
  "timestamp": "2026-06-12T12:00:00.000Z",
  "capability": "text.summarize",
  "input": { "text": "..." },
  "deadline_ms": 30000
}
```

---

## `task_response`

Return the result of a `task_request`.

**Schema:** [`specs/messages/task_response.json`](../specs/messages/task_response.json)

| Field         | Type   | Required | Description                             |
| ------------- | ------ | :------: | --------------------------------------- |
| `in_reply_to` | UUID   |    ✅    | `message_id` of the originating request |
| `status`      | enum   |    ✅    | `success` or `error`                    |
| `output`      | object | success  | Result payload                          |
| `error`       | object |  error   | Structured error (see below)            |

### Error object (`status: error`)

| Field     | Type   | Required | Description                                 |
| --------- | ------ | :------: | ------------------------------------------- |
| `code`    | string |    ✅    | Machine-readable code (e.g. `TASK_TIMEOUT`) |
| `message` | string |    ✅    | Human-readable summary                      |
| `details` | object |    —     | Optional structured context                 |

---

## `delegation`

Delegate a subtask from one agent to another.

**Schema:** [`specs/messages/delegation.json`](../specs/messages/delegation.json)

| Field               | Type   | Required | Description                                |
| ------------------- | ------ | :------: | ------------------------------------------ |
| `parent_message_id` | UUID   |    ✅    | Parent task or delegation being subdivided |
| `capability`        | string |    ✅    | Capability required for the subtask        |
| `input`             | object |    ✅    | Subtask payload                            |
| `to`                | URI    |    —     | Optional direct delegate                   |
| `reason`            | string |    —     | Optional human-readable delegation reason  |

---

## `capability_query`

Discover agents that declare a given capability.

**Schema:** [`specs/messages/capability_query.json`](../specs/messages/capability_query.json)

| Field        | Type    | Required | Description                       |
| ------------ | ------- | :------: | --------------------------------- |
| `capability` | string  |    ✅    | Capability to search for          |
| `limit`      | integer |    —     | Max results (1–100, default `10`) |

> **Note:** Response format for capability queries is defined when the registry layer
> lands (Week 2). The query message schema is stable for routing and discovery requests.

---

## Capability naming

Capabilities use **dot notation**: lowercase segments separated by `.`

- Valid: `text.summarize`, `code.debug`, `orchestrate`
- Invalid: `Text.Summarize`, `code_debug`, empty string

Pattern: `^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*$`

---

## Agent URI format

Agent identities use the URI scheme `agent://`:

- Valid: `agent://summarizer`, `agent://dev.backend`
- Pattern: `^agent://[a-zA-Z0-9][a-zA-Z0-9._-]*$`

Full identity schemas: [`specs/agent/`](../specs/agent/) — see [agent-identity.md](./agent-identity.md).

## Schema strictness

Per-type message schemas compose the shared envelope via `allOf` and use
`unevaluatedProperties: false` at the root (with `type: "object"`) so unknown fields are
rejected without blocking envelope properties from sibling `allOf` branches. Validate
messages with `validateMessage()` from `@oacp/core` — see [message-validation.md](./message-validation.md).
