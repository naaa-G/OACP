# LangChain adapter

`@oacp/integration-langchain` exposes OACP capabilities as LangChain **StructuredTool**
instances your LLM agent can call.

## Install

```bash
pnpm add @oacp/integration-langchain @oacp/sdk @langchain/core zod
```

Monorepo:

```bash
pnpm --filter @oacp/integration-langchain build
```

## When to use

| Scenario                                               | Use OACP LangChain adapter          |
| ------------------------------------------------------ | ----------------------------------- |
| LangChain agent needs a specialist on the OACP network | ✅ `createOacpTool`                 |
| All agents run in-process with `LocalBus`              | ❌ use `@oacp/sdk` `Agent` directly |
| You only need HTTP from Python                         | ❌ use `oacp-sdk`                   |

## Create a tool

```typescript
import { z } from 'zod';
import { createAgentClient, registerDevAgent } from '@oacp/sdk/client';
import { createOacpTool } from '@oacp/integration-langchain';

const client = createAgentClient(process.env.OACP_BASE_URL ?? 'http://127.0.0.1:3000');

await registerDevAgent(client, {
  id: 'agent://langchain-coordinator',
  name: 'LangChain Coordinator',
  capabilities: ['orchestrate'],
});

const planTool = createOacpTool({
  client,
  coordinatorId: 'agent://langchain-coordinator',
  capability: 'startup.plan',
  schema: z.object({ prompt: z.string() }),
  description: 'Ask the OACP PM agent to produce a product plan.',
});

// Smoke test without an LLM API key
const result = await planTool.invoke({ prompt: 'build habit tracker' });
console.log(JSON.parse(String(result)));
```

## Bind to an LLM

Pass the tool to any LangChain agent, graph, or executor that accepts `StructuredTool`:

```typescript
import { createOacpToolkit } from '@oacp/integration-langchain';

const tools = createOacpToolkit({
  client,
  coordinatorId: 'agent://langchain-coordinator',
  tools: [
    {
      capability: 'startup.plan',
      schema: z.object({ prompt: z.string() }),
    },
    {
      capability: 'startup.qa',
      schema: z.object({ project_slug: z.string() }),
    },
  ],
});

// tools → bindTools(llm) or add to AgentExecutor tool list
```

## API

| Export                        | Description                        |
| ----------------------------- | ---------------------------------- |
| `createOacpTool()`            | Single capability → LangChain tool |
| `createOacpToolkit()`         | Batch-create tools                 |
| `executeOacpCapabilityTask()` | Framework-agnostic task helper     |
| `OacpToolError`               | Raised when task status is `error` |
| `capabilityToToolName()`      | Sanitize capability for tool names |

## Runnable example

```bash
pnpm oacp serve --bootstrap startup
pnpm --filter oacp-examples start:langchain-delegate
```

## Error handling

```typescript
import { OacpToolError, executeOacpCapabilityTask } from '@oacp/integration-langchain';

try {
  await executeOacpCapabilityTask(client, {
    from: 'agent://langchain-coordinator',
    capability: 'startup.plan',
    input: { prompt: '…' },
  });
} catch (error) {
  if (error instanceof OacpToolError) {
    console.error(error.code, error.message);
  }
}
```

## Related

- [Integrations overview](./integrations.md)
- [AutoGen adapter](./integration-autogen.md)
- [Remote client](./remote-client.md)
