# OACP v1.0.0-rc.1 — Release candidate

**Pre-release** for OACP v1.0 + MCPLab joint launch (Day 60).

## What's in this RC

- **OACP Console** — Showcase 3D + Ops 2D observability at `/console`
- **Platform** — Docker unified stack, API key auth, SQLite persistence
- **MCPLab sync** — startup backfill from MCPLab Postgres; push on crew complete
- **Adoption kit** — `examples/custom-agents/`, MCP tools server, Cursor skills, docs
- **Frozen API** — `/v1/observability/*` OpenAPI lock (Day 54)

## Quick start

```bash
docker compose up --build -d
open http://127.0.0.1:3847/console/?mode=showcase
pnpm demo:custom-agents
```

## MCPLab full stack

```bash
pnpm docker:mcplab
```

## Breaking changes from v0.1

See [docs/migration/v0.1-to-v1.0.md](docs/migration/v0.1-to-v1.0.md):

- Use `GET /v1/observability/snapshot` instead of `/playground/snapshot`
- Console replaces playground for launch demos
- Message `version` is `"1.0"`

## RC verification

Maintainers ran:

```bash
pnpm test:day59
```

Includes: `pnpm verify`, Day 55 smoke, demo rehearsal, 50-trace RC sync recreate test, MCP smoke, docs build.

## Feedback

Open issues with label `v1.0-rc` before Day 60 ship.

## Full notes

[docs/releases/v1.0.0-rc.1.md](docs/releases/v1.0.0-rc.1.md)
