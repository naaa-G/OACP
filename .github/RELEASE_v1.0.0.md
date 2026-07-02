# OACP v1.0.0 — General availability

**Joint launch** with [MCPLab v1.0.0](https://github.com/naaa-G/MCPLab/releases/tag/v1.0.0).

## What's new

- **OACP Console** — production observability at `/console` (Showcase 3D + Ops 2D, agent catalog, live message feed)
- **Frozen protocol & API** — `/v1/observability/*` OpenAPI lock, JSON Schema v1.0
- **Platform** — Docker unified stack, API key auth, SQLite persistence, MCPLab↔OACP sync
- **Adoption kit** — `examples/custom-agents/`, MCP tools server, Cursor skills, integration docs
- **MCPLab** — public reference lab at [github.com/naaa-G/MCPLab](https://github.com/naaa-G/MCPLab)

## Quick start

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
docker compose up --build -d
open http://127.0.0.1:3847/console/?mode=showcase
```

Bring your own agents (no MCPLab required):

```bash
pnpm install && pnpm build
pnpm --filter oacp-examples start:custom-agents
```

Full MCPLab stack:

```bash
git clone https://github.com/naaa-G/MCPLab.git MCPLab
pnpm docker:mcplab
```

## Breaking changes from v0.1

See [docs/migration/v0.1-to-v1.0.md](docs/migration/v0.1-to-v1.0.md):

| Removed / changed          | Replacement                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `GET /playground/snapshot` | **`GET /v1/observability/snapshot`** (legacy path returns **410 Gone**) |
| Playground HTML UI         | **OACP Console** at `/console` (`/playground` → 302 redirect)           |
| Message `version` `0.1`    | **`1.0`** (SDKs default to 1.0)                                         |

## Upgrade from v1.0.0-rc.1

- No protocol changes since RC — re-point Docker images and npm/PyPI workspace packages to `v1.0.0`
- Replace any `/playground/snapshot` polling with `/v1/observability/snapshot`

## Verification

Maintainers ran:

```bash
pnpm test:day59
```

Includes full `pnpm verify`, Day 55 security smoke, demo rehearsal, 50-trace MCPLab sync recreate test, MCP smoke, and docs build.

## Documentation

- [README](README.md) — enterprise quick start
- [docs/releases/v1.0.0.md](docs/releases/v1.0.0.md) — release notes
- [docs/mcplab.md](docs/mcplab.md) — MCPLab integration
- [docs/bring-your-own-agents.md](docs/bring-your-own-agents.md) — SDK adoption

## Feedback

Open [GitHub issues](https://github.com/naaa-G/OACP/issues) for bugs and integration questions.
