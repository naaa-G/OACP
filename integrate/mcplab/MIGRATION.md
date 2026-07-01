# MCPLab → OACP v1 unified stack migration

Migrate legacy MCPLab deployments that **embedded OACP on port 3001** to the v1 **client-only** model.

## What changed

| Legacy (pre-v1) | v1 unified |
| --------------- | ---------- |
| MCPLab compose includes `oacp :3001` | Single OACP service on `:3847` |
| Playground at `/playground` | **Console** at `/console` |
| Console dev server `:5173` | Served from OACP container |
| Trace links to playground HTML | `?trace_id=` deep links to Console |

## Migration steps

### 1. Stop duplicate OACP processes

When using the unified stack, stop host-side:

- `pnpm oacp serve` on `:3001`
- Duplicate coordinator/worker instances conflicting with Docker health probes

### 2. Update environment variables

```env
# Before
MCPLAB_OACP_SERVER_URL=http://127.0.0.1:3001
MCPLAB_OACP_CONSOLE_URL=http://127.0.0.1:5173

# After
MCPLAB_OACP_SERVER_URL=http://127.0.0.1:3847
MCPLAB_OACP_CONSOLE_URL=http://127.0.0.1:3847/console
MCPLAB_OACP_API_KEY=<same as OACP_API_KEY when auth enabled>
MCPLAB_SYNC_SECRET=<shared sync secret>
```

Inside Docker Compose on `oacp-network`:

```env
MCPLAB_OACP_SERVER_URL=http://oacp:3847
```

### 3. Remove embedded OACP service from MCPLab compose

Delete the `oacp` service block from `MCPLab/docker-compose.yml` if present. MCPLab workers/coordinator should call the external OACP URL only.

### 4. Start unified stack

```bash
pnpm docker:mcplab
# or: docker compose up -d && cd MCPLab && docker compose up -d
```

### 5. Verify sync

```bash
curl -s http://127.0.0.1:3847/health
curl -s http://127.0.0.1:8001/ready   # MCPLab API
```

Run a crew, then open Console from MCPLab web or CLI:

```bash
mcplab trace --trace-id <uuid> --open
```

### 6. Recreate OACP container (sync smoke)

```bash
docker compose restart oacp
# Traces should backfill from MCPLab Postgres — see sync troubleshooting in docs/mcplab.md
```

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| Console empty after OACP recreate | Check MCPLab sync logs; verify `MCPLAB_SYNC_SECRET` and backfill env |
| Intentional history wipe | `docker compose down -v` on **both** OACP and MCPLab stacks |
| Port 3001 still in use | Remove legacy OACP sidecar from MCPLab compose |
| 401 on observability API | Set matching `OACP_API_KEY` / `MCPLAB_OACP_API_KEY` |

See [docs/docker-compose.md](../../docs/docker-compose.md) and [docs/mcplab-oacp-data-model.md](../../docs/mcplab-oacp-data-model.md).
