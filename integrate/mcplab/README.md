# MCPLab client integration

MCPLab is the **flagship OACP integration** — MCP tool servers plus multi-agent crews. MCPLab is an **OACP client**; it does not embed its own OACP server in v1.

## Layout options

| Location | When to use |
| -------- | ----------- |
| `./MCPLab/` | Local clone (gitignored in OACP monorepo until public launch) |
| `./integrate/mcplab/` | Client-only compose templates shipped with OACP |

Resolution order: `integrate/mcplab/` → `MCPLab/` (see `docker/scripts/resolve-mcplab-root.mjs`).

## Unified stack (recommended)

From the OACP repo root:

```bash
pnpm docker:mcplab
```

- OACP + Console: `http://127.0.0.1:3847/console/`
- MCPLab web: `http://127.0.0.1:3002` (port may vary)

## Environment

| Variable | v1 value |
| -------- | -------- |
| `MCPLAB_OACP_SERVER_URL` | `http://oacp:3847` (Docker) or `http://127.0.0.1:3847` (host) |
| `MCPLAB_OACP_CONSOLE_URL` | `http://127.0.0.1:3847/console` |
| `MCPLAB_SYNC_SECRET` | Shared secret for observability sync |
| `MCPLAB_OACP_API_KEY` | Matches `OACP_API_KEY` when auth enabled |

## Migration from legacy embedded OACP

If your MCPLab compose still starts OACP on `:3001`, follow [MIGRATION.md](./MIGRATION.md).

## Docs

- [docs/mcplab.md](../../docs/mcplab.md)
- [docs/mcplab-integration.md](../../docs/mcplab-integration.md)
- [docs/mcplab-oacp-data-model.md](../../docs/mcplab-oacp-data-model.md)
