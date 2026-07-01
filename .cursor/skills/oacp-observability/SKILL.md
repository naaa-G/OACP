---
name: oacp-observability
description: >-
  Wire OACP v1 observability into a project — register agents via @oacp/sdk or
  oacp_sdk, set metadata.fleet/role, send protocol messages, open Console deep links.
  Use when the user asks to add OACP tracing, integrate OACP, or connect agents to the Console.
---

# OACP observability integration

## Goal

Register agents on an OACP server, emit a correlated trace, and open the **OACP Console** deep link. MCPLab is optional.

## Prerequisites

```bash
docker compose up -d
curl -s http://127.0.0.1:3847/health
```

Environment:

| Variable                            | Default                           |
| ----------------------------------- | --------------------------------- |
| `OACP_BASE_URL` / `OACP_SERVER_URL` | `http://127.0.0.1:3847`           |
| `OACP_API_KEY`                      | Required when server auth enabled |

## TypeScript (@oacp/sdk)

```typescript
import { buildTaskRequest, buildTaskResponse, createTraceId } from '@oacp/core';
import { createAgentClient, registerDevAgent, buildConsoleTraceUrl } from '@oacp/sdk';

const client = createAgentClient(process.env.OACP_BASE_URL ?? 'http://127.0.0.1:3847');

await registerDevAgent(client, {
  id: 'agent://my-coordinator',
  name: 'My Coordinator',
  capabilities: ['orchestrate'],
  metadata: { fleet: 'my-fleet', role: 'coordinator' },
});

const traceId = createTraceId();
const request = buildTaskRequest({
  from: 'agent://my-coordinator',
  capability: 'work.echo',
  input: { demo: true },
  traceId,
});
await client.send(request);

console.log(buildConsoleTraceUrl(client.serverUrl, traceId, { mode: 'showcase' }));
```

Reference example: `examples/custom-agents/trace-demo.ts`

Run: `pnpm --filter oacp-examples start:custom-agents`

## Python (oacp_sdk)

```python
from oacp_sdk import AgentClient, register_dev_agent
```

Reference: `examples/custom-agents/trace_demo.py`

## Agent metadata (required for Console)

| Field            | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `metadata.fleet` | Catalog fleet grouping                       |
| `metadata.role`  | Role badge (coordinator, planner, worker, …) |

Unknown fleets → **External** in Console unless `VITE_OACP_CONSOLE_FLEETS` is set at Console build.

## MCP alternative

If the user prefers MCP tools over SDK code: `integrate/mcp-oacp/` — tools `oacp_register_agent`, `oacp_send_task`, `oacp_console_url`.

## Docs

- `docs/bring-your-own-agents.md`
- `docs/integration-surfaces.md`
- `docs/console.md` (user guide)

## Do not

- Build a new HTTP API — use existing `/agents`, `/send-message`, `/v1/observability/*`
- Point launch demos at `/playground` — use `/console`
