# OACP MCP tools server (Day 58)

stdio **MCP server** that wraps the existing OACP HTTP API — for Claude Desktop, Cursor MCP, and any MCP client. **Does not introduce a new protocol.**

## Tools

| Tool                  | Purpose                                |
| --------------------- | -------------------------------------- |
| `oacp_health`         | `GET /health`                          |
| `oacp_register_agent` | `POST /agents` (dev public key)        |
| `oacp_send_task`      | `POST /send-message` (`task_request`)  |
| `oacp_console_url`    | Build `/console/?trace_id=…` deep link |

## Environment

| Variable                             | Default                            |
| ------------------------------------ | ---------------------------------- |
| `OACP_SERVER_URL` or `OACP_BASE_URL` | `http://127.0.0.1:3847`            |
| `OACP_API_KEY`                       | — (Bearer token when auth enabled) |

## Run

```bash
cd integrate/mcp-oacp
pnpm install
pnpm build
pnpm start
```

Development:

```bash
OACP_SERVER_URL=http://127.0.0.1:3847 pnpm dev
```

## Cursor MCP config

Add to `.cursor/mcp.json` (project) or user MCP settings:

```json
{
  "mcpServers": {
    "oacp": {
      "command": "node",
      "args": ["H:/Vs-Code/oacp/integrate/mcp-oacp/dist/server.js"],
      "env": {
        "OACP_SERVER_URL": "http://127.0.0.1:3847",
        "OACP_API_KEY": ""
      }
    }
  }
}
```

Use absolute path to `dist/server.js` on your machine.

## Claude Desktop example

```json
{
  "mcpServers": {
    "oacp": {
      "command": "node",
      "args": ["/path/to/oacp/integrate/mcp-oacp/dist/server.js"],
      "env": {
        "OACP_SERVER_URL": "http://127.0.0.1:3847"
      }
    }
  }
}
```

## Smoke test (HTTP layer)

From repo root after `docker compose up -d`:

```bash
pnpm --filter @oacp/server test -- mcp-oacp-smoke
```

## Related

- [integration-surfaces.md](../../docs/integration-surfaces.md)
- [bring-your-own-agents.md](../../docs/bring-your-own-agents.md)
