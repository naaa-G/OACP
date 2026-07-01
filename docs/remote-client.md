# Remote Agent Client

`AgentClient` in `@oacp/sdk` provides enterprise HTTP transport to `@oacp/server`
nodes for cross-network OACP messaging (Week 2, Day 9).

## Architecture

```text
Coordinator (remote)                    OACP Server Node
      │                                        │
      │  POST /agents (register mailbox)       │
      │ ──────────────────────────────────────►│
      │  POST /send-message (task_request)     │
      │ ──────────────────────────────────────►│ InMemoryMessageBus
      │                                        │      │
      │                                        │      ▼
      │                                        │ Worker agent (onTask)
      │                                        │      │
      │  GET /agent/:id/messages (poll)        │◄─ task_response
      │ ◄──────────────────────────────────────│
```

Remote agents register a **mailbox** on the server, send messages via HTTP, and poll
for responses.

## Quick start

```typescript
import { AgentClient } from '@oacp/sdk';

const client = new AgentClient({ baseUrl: 'http://localhost:3847' });

// Register coordinator mailbox on the remote node
await client.registerAgent({
  id: 'agent://coordinator',
  name: 'Coordinator',
  version: '1.0',
  capabilities: ['orchestrate'],
  publicKey: {
    /* JWK or PEM */
  },
});

const result = await client.sendTask({
  from: 'agent://coordinator',
  capability: 'text.summarize',
  input: { text: 'Hello over the network' },
});

console.log(result.output);
```

### Recommended factories (Day 27)

For production-style imports, use the `@oacp/sdk/client` subpath and helpers:

```typescript
import { createAgentClient, registerDevAgent } from '@oacp/sdk/client';

const client = createAgentClient(process.env.OACP_BASE_URL ?? 'http://127.0.0.1:3000');

await registerDevAgent(client, {
  id: 'agent://coordinator',
  name: 'Coordinator',
  capabilities: ['orchestrate'],
});
```

`registerDevAgent` uses `DEFAULT_DEV_PUBLIC_KEY` — replace with real keys before deployment.
See [TypeScript SDK](./sdk-typescript.md) and [Python SDK](./sdk-python.md).

## API

| Method                    | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| `health()`                | `GET /health` — server liveness                       |
| `registerAgent(identity)` | `POST /agents` — enroll mailbox on node               |
| `getAgent(id)`            | `GET /agent/:id` — lookup registered agent            |
| `listAgents(options)`     | `GET /agents` — list or filter by capability          |
| `findAgentsByCapability`  | `GET /capabilities/:capability/agents` — discovery    |
| `send(message)`           | `POST /send-message` — fire-and-forget send           |
| `receiveMessage(agentId)` | `GET /agent/:id/messages` — pull next mailbox message |
| `sendTask(params)`        | Build `task_request`, send, poll for `task_response`  |
| `runWorkflow(id, input)`  | `POST /workflows/:id/run` — execute a DAG workflow    |

## Configuration

```typescript
const client = new AgentClient({
  baseUrl: 'http://oacp-node.internal:3847',
  timeoutMs: 30_000,
  headers: { Authorization: 'Bearer …' }, // optional
  fetchFn: customFetch, // optional — for tests or edge runtimes
});
```

| Option        | Default                | Description                         |
| ------------- | ---------------------- | ----------------------------------- |
| `baseUrl`     | required               | OACP server root URL                |
| `timeoutMs`   | `30000`                | HTTP request timeout                |
| `headers`     | `{}`                   | Extra request headers               |
| `retryPolicy` | `DEFAULT_RETRY_POLICY` | Backoff retries; `false` to disable |

### `sendTask` options

| Field               | Default     | Description                      |
| ------------------- | ----------- | -------------------------------- |
| `waitForResponse`   | `true`      | Poll mailbox for `task_response` |
| `responseTimeoutMs` | `timeoutMs` | Max wait for response            |
| `pollIntervalMs`    | `100`       | Delay between poll attempts      |

## Retries and delivery (Day 12)

`AgentClient` uses **at-least-once** HTTP delivery with exponential backoff on transient errors
(network, timeout, 5xx). Validation and routing errors (4xx) are not retried.

```typescript
const client = new AgentClient({
  baseUrl: 'http://localhost:3847',
  retryPolicy: { maxAttempts: 5, initialBackoffMs: 200, maxBackoffMs: 8_000, jitter: true },
});

console.log(client.deliveryGuarantee); // "at-least-once"
```

See [reliable-delivery.md](./reliable-delivery.md) for idempotency guidance.

## Error handling

All failures throw `OacpClientError` with machine-readable `code`:

| Code                       | When                               |
| -------------------------- | ---------------------------------- |
| `CLIENT_NETWORK_ERROR`     | Connection / DNS failure           |
| `CLIENT_TIMEOUT`           | HTTP request exceeded `timeoutMs`  |
| `CLIENT_VALIDATION_FAILED` | Server rejected message (400)      |
| `CLIENT_ROUTING_FAILED`    | No recipient on server (404)       |
| `CLIENT_AGENT_NOT_FOUND`   | Agent not registered (404)         |
| `CLIENT_RESPONSE_TIMEOUT`  | No `task_response` within deadline |
| `CLIENT_SERVER_ERROR`      | Other server errors (5xx)          |

```typescript
import { OacpClientError, CLIENT_ERROR_CODES } from '@oacp/sdk';

try {
  await client.sendTask({ from: '…', capability: '…', input: {} });
} catch (error) {
  if (error instanceof OacpClientError) {
    console.error(error.code, error.statusCode, error.details);
  }
}
```

## Capability discovery (Day 10)

Discover workers before sending tasks — avoids hard-coded agent URIs:

```typescript
const workers = await client.findAgentsByCapability('text.summarize', { limit: 5 });
const target = workers[0];
if (!target) throw new Error('No summarizer registered');

await client.sendTask({
  from: 'agent://coordinator',
  capability: 'text.summarize',
  to: target.id,
  input: { text: '…' },
});
```

Agents must be registered on the server (`POST /agents`) to appear in discovery results.
See [registry-design.md](./registry-design.md).

## Local vs remote

| Pattern              | Use when                                            |
| -------------------- | --------------------------------------------------- |
| `Agent` + `LocalBus` | Agents in the same Node.js process (Week 1)         |
| `AgentClient`        | Agents on different hosts talking to `@oacp/server` |

## Runnable example

```bash
pnpm build
pnpm install
pnpm --filter oacp-examples start:remote
```

See [examples/remote-agent/README.md](../examples/remote-agent/README.md).

## Related

- [HTTP server](./http-server.md) — server endpoints and deployment
- [Agent runtime](./agent-runtime.md) — local `sendTask` / `onTask`
- [Integration testing](./integration-testing.md) — test patterns
