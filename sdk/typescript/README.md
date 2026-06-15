# TypeScript SDK (`@oacp/sdk`)

The primary SDK for building OACP agents and remote clients.

## Install

```bash
pnpm add @oacp/sdk
```

Monorepo:

```bash
pnpm --filter @oacp/sdk build
```

## Package exports

| Import             | Use case                                               |
| ------------------ | ------------------------------------------------------ |
| `@oacp/sdk`        | Full surface — agents, client, workflow, observability |
| `@oacp/sdk/client` | Remote HTTP client only (smaller import graph)         |

## Local agents (in-process)

```typescript
import { Agent, LocalBus } from '@oacp/sdk';

const bus = new LocalBus();

const worker = new Agent({
  name: 'summarizer',
  capabilities: ['text.summarize'],
  bus,
  onTask: (task) => ({
    output: { summary: String(task.input.text ?? '') },
  }),
});

const coordinator = new Agent({ name: 'coordinator', capabilities: ['orchestrate'], bus });

worker.start();
coordinator.start();

const result = await coordinator.sendTask({
  capability: 'text.summarize',
  input: { text: 'Hello OACP' },
});

console.log(result.output);
worker.stop();
coordinator.stop();
```

## Remote client (HTTP)

```typescript
import { createAgentClient, registerDevAgent, DEFAULT_DEV_PUBLIC_KEY } from '@oacp/sdk/client';

const client = createAgentClient('http://127.0.0.1:3000');

await registerDevAgent(client, {
  id: 'agent://coordinator',
  name: 'Coordinator',
  capabilities: ['orchestrate'],
});

const result = await client.sendTask({
  from: 'agent://coordinator',
  capability: 'text.summarize',
  input: { text: 'Hello over HTTP' },
});
```

`registerDevAgent` uses `DEFAULT_DEV_PUBLIC_KEY` — replace with production keys before deployment.

## Run a workflow

```typescript
import { createAgentClient } from '@oacp/sdk/client';

const client = createAgentClient('http://127.0.0.1:3000', { timeoutMs: 60_000 });
const result = await client.runWorkflow('autonomous-startup-v1', {
  prompt: 'build todo app',
});

if (result.ok) {
  console.log(result.output);
  console.log(result.traceId);
}
```

## API highlights

| API                   | Description                                      |
| --------------------- | ------------------------------------------------ |
| `Agent`               | Local agent with `sendTask`, `onTask`, lifecycle |
| `LocalBus`            | Shared in-process message bus                    |
| `AgentClient`         | HTTP client for `@oacp/server`                   |
| `createAgentClient()` | Factory for remote clients                       |
| `registerDevAgent()`  | Quick dev registration with default key          |
| `runPipeline()`       | Sequential local agent chain                     |
| `WorkflowEngine`      | DAG orchestration (re-exported from core)        |
| `TraceClient`         | Trace list/detail HTTP client                    |

## Reliability

`AgentClient` defaults to retries with exponential backoff (`DEFAULT_RETRY_POLICY`). Disable with `retryPolicy: false`.

Delivery guarantee: **at-least-once** over HTTP when retries are enabled.

## Examples

```bash
pnpm --filter oacp-examples start:local
pnpm --filter oacp-examples start:sdk-workflow
pnpm --filter oacp-examples start:sdk-remote
```

See [`docs/sdk-typescript.md`](../../docs/sdk-typescript.md) and [`docs/remote-client.md`](../../docs/remote-client.md).

## Development

```bash
pnpm --filter @oacp/sdk build
pnpm --filter @oacp/sdk test
```

## License

Apache-2.0
