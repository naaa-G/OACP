# TypeScript SDK (`@oacp/sdk`)

Primary SDK for building OACP agents, remote clients, and orchestrators.

## Install

```bash
pnpm add @oacp/sdk
# Monorepo
pnpm --filter @oacp/sdk build
```

## Imports

| Module             | When to use                                          |
| ------------------ | ---------------------------------------------------- |
| `@oacp/sdk`        | Agents, buses, workflows, observability — full API   |
| `@oacp/sdk/client` | Remote HTTP only — `AgentClient`, factories, retries |

## Quick patterns

### Local multi-agent

```typescript
import { Agent, LocalBus } from '@oacp/sdk';

const bus = new LocalBus();
const worker = new Agent({
  name: 'worker',
  capabilities: ['text.summarize'],
  bus,
  onTask: (task) => ({ output: { summary: String(task.input.text ?? '') } }),
});
worker.start();

const coordinator = new Agent({ name: 'coordinator', capabilities: ['orchestrate'], bus });
coordinator.start();

const result = await coordinator.sendTask({
  capability: 'text.summarize',
  input: { text: 'Hello' },
});
```

### Remote HTTP

```typescript
import { createAgentClient, registerDevAgent } from '@oacp/sdk/client';

const client = createAgentClient(process.env.OACP_BASE_URL ?? 'http://127.0.0.1:3000');
await registerDevAgent(client, {
  id: 'agent://coordinator',
  name: 'Coordinator',
  capabilities: ['orchestrate'],
});

const result = await client.sendTask({
  from: 'agent://coordinator',
  capability: 'text.summarize',
  input: { text: 'Remote hello' },
});
```

### Workflow from Python/TS coordinator

```typescript
const result = await client.runWorkflow('autonomous-startup-v1', {
  prompt: 'build todo app',
});
```

## Enterprise defaults

- **Retries** — transient HTTP failures retried with backoff (`DEFAULT_RETRY_POLICY`)
- **Timeouts** — configurable per client and per `sendTask`
- **Dev keys** — `registerDevAgent` + `DEFAULT_DEV_PUBLIC_KEY` for demos only (defaults to `replace: true` for idempotent re-runs)
- **Typed errors** — `OacpClientError` with `CLIENT_ERROR_CODES`

## Related

- [Remote client](./remote-client.md) — HTTP API details
- [Agent runtime](./agent-runtime.md)
- [Python SDK](./sdk-python.md)
- [Examples](../examples/sdk/README.md)
