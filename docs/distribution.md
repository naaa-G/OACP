# Distribution guide

Where to get OACP components and **when to use each**. Runtime packages ≠ IDE skills ≠ MCP tools.

## Packages

| Artifact                          | Install                                            | Use when                                          |
| --------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| **OACP platform (Docker)**        | `docker compose up -d`                             | Demos, local prod-like stack, CI                  |
| **`@oacp/sdk`**                   | `pnpm add @oacp/sdk` (workspace: `sdk/typescript`) | TypeScript agents and coordinators                |
| **`oacp-sdk` (Python)**           | `pip install oacp-sdk` (workspace: `sdk/python`)   | Python agents and MCPLab-style labs               |
| **`@oacp/observability-client`**  | Workspace package                                  | Building custom UIs over `/v1/observability/*`    |
| **`@oacp/integration-langchain`** | Workspace                                          | LangChain tool delegation                         |
| **`@oacp/mcp-server`**            | `integrate/mcp-oacp` (private workspace)           | MCP-native AI clients                             |
| **OACP Console**                  | Served at `/console` from platform image           | Default observability UI — do not fork for launch |

## Docker (recommended for evaluators)

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
docker compose up -d
open http://127.0.0.1:3847/console/
```

Profiles:

| Profile | Command                                                                           | Result                    |
| ------- | --------------------------------------------------------------------------------- | ------------------------- |
| Default | `docker compose up -d`                                                            | OACP + Console            |
| Demo    | `docker compose --profile demo up seed-demo`                                      | + MCPLab-style seed trace |
| MCPLab  | `git clone https://github.com/naaa-G/MCPLab.git MCPLab` then `pnpm docker:mcplab` | Full lab stack            |

See [docker-compose.md](./docker-compose.md).

## npm / PyPI (integrators)

Monorepo packages ship at **v1.0.0** with the protocol freeze. For local development:

```bash
pnpm install
pnpm build
pnpm --filter @oacp/sdk test
pip install -e sdk/python
```

Publish tags follow GitHub releases (`v1.0.0`).

## Cursor skills (IDE only)

| Skill              | Path                                 | Trigger                            |
| ------------------ | ------------------------------------ | ---------------------------------- |
| OACP observability | `.cursor/skills/oacp-observability/` | “Add OACP tracing to this project” |
| MCPLab demo        | `.cursor/skills/mcplab-demo/`        | “Run MCPLab demo stack”            |

Copy from [integrate/skills/](../integrate/skills/) if using OACP as a template in another repo.

Skills are **markdown instructions** for Cursor Agent — not runtime libraries.

## MCP tools server

Build and configure for Claude Desktop / Cursor MCP:

```bash
cd integrate/mcp-oacp
pnpm install && pnpm build
```

See [integrate/mcp-oacp/README.md](../integrate/mcp-oacp/README.md).

## Examples gallery

| Example                | Command                                                                           |
| ---------------------- | --------------------------------------------------------------------------------- |
| Custom agents (Day 58) | `pnpm --filter oacp-examples start:custom-agents`                                 |
| SDK remote             | `pnpm --filter oacp-examples start:sdk-remote`                                    |
| LangChain              | `pnpm --filter oacp-examples start:langchain-delegate`                            |
| MCPLab                 | `git clone https://github.com/naaa-G/MCPLab.git MCPLab` then `pnpm docker:mcplab` |

Index: [examples-gallery.md](./examples-gallery.md)

## Decision tree

```text
Need observability UI?     → Use bundled Console (/console)
Building an agent in TS?   → @oacp/sdk
Building an agent in Py?   → oacp-sdk
AI client speaks MCP?      → integrate/mcp-oacp
Using Cursor to integrate? → .cursor/skills/oacp-observability
Need MCP tools + crews?    → MCPLab (optional flagship)
```

## Related

- [integration-surfaces.md](./integration-surfaces.md)
- [bring-your-own-agents.md](./bring-your-own-agents.md)
- [releases/v1.0.0.md](./releases/v1.0.0.md)
