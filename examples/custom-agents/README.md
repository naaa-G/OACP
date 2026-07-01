# Custom agents example (Day 58)

Minimal **bring-your-own-agents** trace — two registered agents, one delegation, Console deep link. **No MCPLab required.**

## Prerequisites

```bash
docker compose up -d
# or: pnpm oacp serve --bootstrap demo
```

If API key auth is enabled, set `OACP_API_KEY` in the environment.

## TypeScript

```bash
pnpm --filter oacp-examples start:custom-agents
```

## Python

```bash
pip install -e sdk/python
OACP_BASE_URL=http://127.0.0.1:3847 python examples/custom-agents/trace_demo.py
```

## What you should see

1. Two agents registered with `metadata.fleet=custom-demo`
2. A trace with `task_request` → `task_response`
3. A Console URL — open it in the browser

Custom fleets appear under **External** in the Console unless you configure labels:

```bash
VITE_OACP_CONSOLE_FLEETS='{"custom-demo":"Custom demo"}' pnpm --filter @oacp/console build
```

## Next steps

- [bring-your-own-agents.md](../../docs/bring-your-own-agents.md)
- [integration-surfaces.md](../../docs/integration-surfaces.md)
- [MCPLab flagship demo](../../docs/mcplab.md)
