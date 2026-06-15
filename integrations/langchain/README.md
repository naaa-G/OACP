# @oacp/integration-langchain

LangChain tools adapter for OACP — expose agent capabilities as `StructuredTool` instances
your LLM can call.

## Install

```bash
pnpm add @oacp/integration-langchain @oacp/sdk @langchain/core zod
```

Monorepo:

```bash
pnpm --filter @oacp/integration-langchain build
```

## Quick start

```typescript
import { z } from 'zod';
import { createAgentClient, registerDevAgent } from '@oacp/sdk/client';
import { createOacpTool } from '@oacp/integration-langchain';

const client = createAgentClient('http://127.0.0.1:3000');
await registerDevAgent(client, {
  id: 'agent://langchain-coordinator',
  name: 'LangChain Coordinator',
  capabilities: ['orchestrate'],
});

const summarizeTool = createOacpTool({
  client,
  coordinatorId: 'agent://langchain-coordinator',
  capability: 'text.summarize',
  schema: z.object({ text: z.string() }),
});

// Invoke directly (no LLM API key required for smoke tests)
const result = await summarizeTool.invoke({ text: 'Hello OACP' });
console.log(JSON.parse(String(result)));
```

Bind tools to a LangChain agent / graph as you would any other `StructuredTool`.

## API

| Export                        | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| `createOacpTool()`            | Single capability → LangChain tool             |
| `createOacpToolkit()`         | Batch-create tools from capability definitions |
| `executeOacpCapabilityTask()` | Framework-agnostic task execution              |
| `OacpToolError`               | Typed error when task status is `error`        |

Guide: [`docs/integration-langchain.md`](../../docs/integration-langchain.md)

## License

Apache-2.0
