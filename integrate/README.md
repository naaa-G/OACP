# OACP integration kit (Day 58)

Adoption paths for external developers and AI runtimes. Pick the surface that matches your client — they all talk to the **same OACP server**.

| Path                 | Best for                                       | Location                                                        |
| -------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| **SDK / HTTP**       | Any app, LangChain, AutoGen, custom agents     | [`@oacp/sdk`](../sdk/typescript/), [`oacp_sdk`](../sdk/python/) |
| **Minimal example**  | 15-minute proof                                | [`examples/custom-agents/`](../examples/custom-agents/)         |
| **MCPLab reference** | MCP tools + multi-agent crews                  | [`integrate/mcplab/`](./mcplab/) or `./MCPLab/`                 |
| **MCP tools server** | Claude Desktop, Cursor MCP, MCP-native clients | [`integrate/mcp-oacp/`](./mcp-oacp/)                            |
| **Cursor skills**    | Cursor Agent onboarding                        | [`.cursor/skills/`](../.cursor/skills/)                         |

## Quick start (any project)

```bash
# 1. Start OACP platform
docker compose up -d

# 2. Run the custom-agents example
pnpm --filter oacp-examples start:custom-agents

# 3. Open the Console URL printed by the script
```

Environment:

| Variable                            | Default                 | Purpose                              |
| ----------------------------------- | ----------------------- | ------------------------------------ |
| `OACP_BASE_URL` / `OACP_SERVER_URL` | `http://127.0.0.1:3847` | OACP HTTP API                        |
| `OACP_API_KEY`                      | —                       | Required when server auth is enabled |
| `OACP_PUBLIC_URL`                   | same as server URL      | Console links shown to users         |

## Full MCPLab stack

```bash
pnpm docker:mcplab
```

See [mcplab/README.md](./mcplab/README.md) and [docs/mcplab.md](../docs/mcplab.md).

## Documentation

- [integration-surfaces.md](../docs/integration-surfaces.md) — SDK vs MCP vs Cursor skill
- [bring-your-own-agents.md](../docs/bring-your-own-agents.md)
- [distribution.md](../docs/distribution.md)
