# Reliable Delivery

OACP Week 2 Day 12 — retries, timeouts, and delivery guarantees for remote HTTP transport.

## Delivery guarantees

| Transport                | Guarantee     | Mechanism                   |
| ------------------------ | ------------- | --------------------------- |
| `LocalBus` / core bus    | at-most-once  | In-process, no retries      |
| `AgentClient` (HTTP)     | at-least-once | Exponential backoff retries |
| `AgentClient` (no retry) | at-most-once  | `retryPolicy: false`        |

Remote handlers should treat duplicate `message_id` values as idempotent (or dedupe in the worker).

## Retry policy

`@oacp/core` provides `executeWithRetry` and `DEFAULT_RETRY_POLICY`:

| Field              | Default | Description                  |
| ------------------ | ------- | ---------------------------- |
| `maxAttempts`      | `3`     | Total tries including first  |
| `initialBackoffMs` | `100`   | Base delay before retry 2    |
| `maxBackoffMs`     | `5000`  | Cap on exponential backoff   |
| `jitter`           | `true`  | Randomize delay (production) |

Backoff formula: `min(maxBackoff, initial × 2^(attempt-1))` with optional full jitter.

## What gets retried

`AgentClient` retries **transient** failures only:

| Retried                     | Not retried                      |
| --------------------------- | -------------------------------- |
| `CLIENT_NETWORK_ERROR`      | `CLIENT_VALIDATION_FAILED` (400) |
| `CLIENT_TIMEOUT`            | `CLIENT_ROUTING_FAILED` (404)    |
| `CLIENT_SERVER_ERROR` (5xx) | `CLIENT_AGENT_NOT_FOUND`         |
| HTTP 502 / 503 / 504        | `CLIENT_RESPONSE_TIMEOUT`        |

## SDK configuration

```typescript
import { AgentClient, DEFAULT_RETRY_POLICY } from '@oacp/sdk';

const client = new AgentClient({
  baseUrl: 'http://localhost:3847',
  timeoutMs: 30_000,
  retryPolicy: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 5,
    maxBackoffMs: 10_000,
  },
});

console.log(client.deliveryGuarantee); // "at-least-once"

// Disable retries for fire-and-forget probes
const probe = new AgentClient({ baseUrl: '…', retryPolicy: false });
```

### `sendTask` behaviour

1. Builds one `task_request` with a stable `message_id`.
2. Retries `POST /send-message` on transient HTTP errors (same body).
3. Polls mailbox for `task_response` (separate per-poll retries).

Set `responseTimeoutMs` for end-to-end task wait; `timeoutMs` applies per HTTP call.

## Server timeouts

| Variable                         | Default | Scope            |
| -------------------------------- | ------- | ---------------- |
| `OACP_SERVER_REQUEST_TIMEOUT_MS` | `30000` | Fastify request  |
| `timeoutMs` query on mailbox GET | `5000`  | Server-side wait |

## Idempotency guidance

For production task handlers:

1. Use stable `message_id` from the client (SDK generates UUID per `sendTask`).
2. Workers should dedupe processed `message_id` values (in-memory or store).
3. Side-effecting tasks need idempotent handlers under at-least-once delivery.

Exactly-once delivery is out of scope for Week 2; see [failure-recovery.md](./failure-recovery.md) (Day 19) for orchestrator-level failover.

## Core API

```typescript
import { executeWithRetry, computeBackoffMs, DEFAULT_RETRY_POLICY } from '@oacp/core';

await executeWithRetry(async (attempt) => doWork(attempt), DEFAULT_RETRY_POLICY, {
  shouldRetry: (error) => isTransient(error),
});
```

## Related

- [Remote client](./remote-client.md) — `AgentClient` API
- [Capability routing](./capability-routing.md) — auto-route by capability
- [Message bus](./message-bus.md) — local at-most-once semantics
