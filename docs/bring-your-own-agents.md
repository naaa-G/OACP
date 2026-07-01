# Bring your own agents

Connect **your** multi-agent system to OACP in about **15 minutes** — no MCPLab required. You will register agents, emit a trace, and open the **OACP Console**.

## Prerequisites

- Node 20+ and pnpm (or Python 3.10+ for the Python path)
- OACP server running

```bash
docker compose up -d
# → http://127.0.0.1:3847/console/
```

If `OACP_API_KEY` is set in `.env`, export it for SDK examples:

```bash
export OACP_API_KEY=your-key
export OACP_BASE_URL=http://127.0.0.1:3847
```

## Quick path (TypeScript)

```bash
pnpm --filter oacp-examples start:custom-agents
```

Open the **Console URL** printed at the end.

Source: [examples/custom-agents/trace-demo.ts](../examples/custom-agents/trace-demo.ts)

## Quick path (Python)

```bash
pip install -e sdk/python
OACP_BASE_URL=http://127.0.0.1:3847 python examples/custom-agents/trace_demo.py
```

## What the example does

1. Registers **two agents** with `metadata.fleet` and `metadata.role`
2. Sends a `task_request` (coordinator → worker) and `task_response`
3. Prints a Console deep link: `/console/?trace_id=…&mode=showcase`

## Register agents (contract)

Every agent should include observability metadata for the Console catalog:

```typescript
await registerDevAgent(client, {
  id: 'agent://my-planner',
  name: 'My Planner',
  capabilities: ['plan', 'orchestrate'],
  metadata: {
    fleet: 'my-company', // Console fleet grouping
    role: 'planner', // Role badge + filters
  },
});
```

| Field            | Required    | Purpose                                                                    |
| ---------------- | ----------- | -------------------------------------------------------------------------- |
| `id`             | Yes         | Stable URI (`agent://…`)                                                   |
| `capabilities`   | Yes         | Routing and Console capability labels                                      |
| `metadata.fleet` | Recommended | Fleet section in agent catalog                                             |
| `metadata.role`  | Recommended | Role badge (see [mcplab-integration.md](./mcplab-integration.md) taxonomy) |
| `publicKey`      | Yes         | Use real keys in production; `registerDevAgent` uses dev key for demos     |

Unknown fleets appear under **External** unless you configure labels at Console build time:

```bash
VITE_OACP_CONSOLE_FLEETS='{"my-company":"My Company"}' pnpm --filter @oacp/console build
```

## Send messages

Use typed protocol messages (`task_request`, `task_response`, …) with a shared `trace_id`:

```typescript
import { buildTaskRequest, buildTaskResponse, createTraceId } from '@oacp/core';
import { buildConsoleTraceUrl } from '@oacp/sdk';

const traceId = createTraceId();
const request = buildTaskRequest({
  from: 'agent://my-planner',
  to: 'agent://my-worker',
  capability: 'work.echo',
  input: { goal: 'demo' },
  traceId,
});
await client.send(request);

await client.send(
  buildTaskResponse({
    from: 'agent://my-worker',
    inReplyTo: request.message_id,
    traceId,
    status: 'success',
    output: { done: true },
  }),
);

console.log(buildConsoleTraceUrl(process.env.OACP_BASE_URL!, traceId));
```

## Console deep links

| Param            | Example             | Purpose                         |
| ---------------- | ------------------- | ------------------------------- |
| `trace_id`       | Required            | Select trace                    |
| `mode`           | `showcase` or `ops` | 3D demo vs delegation hierarchy |
| `showcase_fleet` | `mcplab`            | Fleet filter in Showcase        |

Full URL reference: [console.md](./console.md#user-guide)

## Framework adapters

| Framework | Package                       | Doc                                                    |
| --------- | ----------------------------- | ------------------------------------------------------ |
| LangChain | `@oacp/integration-langchain` | [integration-langchain.md](./integration-langchain.md) |
| AutoGen   | `oacp-autogen`                | [integration-autogen.md](./integration-autogen.md)     |

## MCP without SDK code

If your client uses MCP tools: [integrate/mcp-oacp/README.md](../integrate/mcp-oacp/README.md)

## Troubleshooting

| Issue                 | Fix                                                                     |
| --------------------- | ----------------------------------------------------------------------- |
| Connection refused    | `curl http://127.0.0.1:3847/health` — start Docker or `pnpm oacp serve` |
| 401 Unauthorized      | Set `OACP_API_KEY`; pass `x-api-key` or Bearer header in SDK            |
| Empty Console         | Run the example again; check `GET /v1/observability/snapshot`           |
| Agents under External | Set `metadata.fleet` or configure `VITE_OACP_CONSOLE_FLEETS`            |

## Next steps

- [integration-surfaces.md](./integration-surfaces.md) — SDK vs MCP vs Cursor skill
- [mcplab.md](./mcplab.md) — flagship MCP × OACP lab
- [distribution.md](./distribution.md) — package install paths
