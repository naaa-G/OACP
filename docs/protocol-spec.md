# Protocol Specification

OACP defines a versioned message protocol for multi-agent task execution and collaboration.

## Versioning

| Layer        | Current version | Location                           |
| ------------ | --------------- | ---------------------------------- |
| Protocol     | `0.1`           | Message `version` field + `specs/` |
| `@oacp/core` | `0.1.0`         | npm package                        |
| `@oacp/sdk`  | `0.1.0`         | npm package                        |

### Version policy

- **Patch** — documentation, non-breaking schema clarifications.
- **Minor** — backward-compatible message fields or new optional message types.
- **Major** — breaking schema or semantic changes (requires protocol version bump).

During alpha (`0.x`), breaking changes are expected. Pin exact package versions.

## Message envelope

Every OACP message includes a common envelope defined in [`specs/oacp.schema.json`](../specs/oacp.schema.json).
Type-specific fields are defined in [`specs/messages/`](../specs/messages/).

```json
{
  "type": "task_request",
  "version": "0.1",
  "message_id": "550e8400-e29b-41d4-4716-446655440001",
  "trace_id": "0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b",
  "from": "agent://coordinator",
  "timestamp": "2026-06-12T12:00:00.000Z"
}
```

| Field        | Required | Description                                   |
| ------------ | :------: | --------------------------------------------- |
| `type`       |    ✅    | Message type discriminator                    |
| `version`    |    ✅    | Protocol version (`"0.1"`)                    |
| `message_id` |    ✅    | Unique ID for this message (UUID)             |
| `trace_id`   |    ✅    | Correlation ID across related messages (UUID) |
| `from`       |    ✅    | Sender agent URI (`agent://…`)                |
| `timestamp`  |    ✅    | ISO 8601 UTC creation time                    |

## Core message types (`v0.1`)

| Type               | Purpose                                  | Schema                                 | Status |
| ------------------ | ---------------------------------------- | -------------------------------------- | :----: |
| `task_request`     | Request work from an agent or capability | `specs/messages/task_request.json`     |   ✅   |
| `task_response`    | Return task result or error              | `specs/messages/task_response.json`    |   ✅   |
| `delegation`       | Delegate a subtask to another agent      | `specs/messages/delegation.json`       |   ✅   |
| `capability_query` | Discover agents by capability            | `specs/messages/capability_query.json` |   ✅   |
| `memory_share`     | Share scoped context between agents      | `specs/messages/memory_share.json`     |   ⚪   |
| `heartbeat`        | Liveness signaling                       | `specs/messages/heartbeat.json`        |   ⚪   |

Example payloads: [`specs/examples/`](../specs/examples/).

## Shared definitions

Reusable `$defs` in `oacp.schema.json`:

| Definition        | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `agentUri`        | Agent identity URI pattern                      |
| `capability`      | Dot-notation capability identifier              |
| `messageId`       | UUID message identifier                         |
| `traceId`         | UUID trace/correlation identifier               |
| `payload`         | Arbitrary JSON object for input/output          |
| `taskError`       | Structured error (`code`, `message`, `details`) |
| `messageEnvelope` | Common fields on every message                  |

## Agent identity

Agents are identified by:

- `id` — stable URI (e.g. `agent://summarizer`)
- `name` — human-readable label
- `capabilities[]` — declared skills for routing
- `publicKey` — cryptographic identity (PEM or JWK)

Schemas: [`specs/agent/identity.schema.json`](../specs/agent/identity.schema.json) ✅ **Day 3**

See [agent-identity.md](./agent-identity.md) for validation APIs and examples.

## Schema loading (`@oacp/core`)

Schemas are copied into `@oacp/core` at build time (`core/schemas/`) and loaded via:

```typescript
import { loadMessageSchema, MESSAGE_TYPES } from '@oacp/core';

const schema = loadMessageSchema(MESSAGE_TYPES.TASK_REQUEST);
```

## Validation ✅ (Day 4)

All OACP messages **must** pass validation before routing. Implementation:
`core/src/protocol/message-validator.ts`.

```typescript
import { validateMessage, parseMessageType } from '@oacp/core';

const task = parseMessageType(payload, 'task_request');
```

Enforces JSON Schema conformance, protocol version (`0.1`), and message-type discrimination.
Full API: [message-validation.md](./message-validation.md).

## Interoperability

OACP is designed as a **collaboration layer**. Agents may use MCP for tool access and
bridge to A2A-compatible transports where appropriate. OACP coordinates multi-agent
workflows; it does not replace model or tool protocols.

See [message-types.md](./message-types.md) for per-type field reference.
