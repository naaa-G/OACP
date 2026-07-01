# MCPLab ↔ OACP observability data model (Day 53)

## Stores

| Store                                            | Location                           | Role                                                                   |
| ------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------- |
| MCPLab Postgres                                  | `MCPLab` stack                     | Source of record for crew runs, `trace_id`, replayable export payloads |
| OACP SQLite (`obs_agents`, `obs_trace_messages`) | `oacp` container `/data/memory.db` | Live observability target — Console snapshot + SSE                     |
| OACP in-memory bus                               | `oacp` process                     | Hot path for active traces; hydrated from SQLite on startup            |

## Sync direction

### MCPLab → OACP

| Trigger           | Mechanism                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| OACP startup      | `OACP_IMPORT_FROM_MCPLAB=1` → fetch `MCPLAB_OBSERVABILITY_EXPORT_URL` → `POST /v1/observability/import` per missing `trace_id` |
| Crew run complete | MCPLab worker pushes export payload to OACP import API                                                                         |
| Manual repair     | `node docker/oacp-mcplab-sync.mjs` or custom script                                                                            |

**Export format (MCPLab `GET /internal/observability/export`):**

```json
{
  "ok": true,
  "exports": [
    {
      "trace_id": "uuid",
      "run_id": "optional-mcplab-run-id",
      "agents": [
        {
          "id": "agent://...",
          "name": "...",
          "capabilities": [],
          "version": "1.0",
          "publicKey": {}
        }
      ],
      "messages": [
        {
          "type": "task_request",
          "message_id": "...",
          "trace_id": "...",
          "from": "...",
          "timestamp": "..."
        }
      ],
      "completed_at": "2026-06-30T12:00:00.000Z"
    }
  ]
}
```

**Import API:** `POST /v1/observability/import` — idempotent on `message_id`; registers agents with `replace=true`.

### OACP → MCPLab

When a root trace completes, OACP POSTs to `MCPLAB_TRACE_STATUS_WEBHOOK_URL`:

```json
{
  "trace_id": "uuid",
  "trace_status": "completed",
  "message_count": 12,
  "completed_at": "2026-06-30T12:00:00.000Z",
  "run_id": "optional"
}
```

## Failure modes

| Failure                                     | Behavior                                                           |
| ------------------------------------------- | ------------------------------------------------------------------ |
| MCPLab export unreachable on startup        | OACP starts; log warning; Console shows in-memory traces only      |
| Partial import                              | Per-trace errors counted in sync metrics; successful traces remain |
| Duplicate `message_id`                      | Skipped (idempotent)                                               |
| OACP container recreated                    | Startup backfill re-imports from MCPLab Postgres via export API    |
| `docker compose down -v` on **both** stacks | Intentional wipe of synced history                                 |

## Environment variables

| Variable                          | Service | Purpose                                                       |
| --------------------------------- | ------- | ------------------------------------------------------------- |
| `OACP_IMPORT_FROM_MCPLAB`         | `oacp`  | Enable startup backfill (`1` / `true`)                        |
| `MCPLAB_OBSERVABILITY_EXPORT_URL` | `oacp`  | e.g. `http://mcplab-api:8001/internal/observability/export`   |
| `MCPLAB_SYNC_SECRET`              | both    | Shared auth for export/webhook (falls back to `OACP_API_KEY`) |
| `MCPLAB_TRACE_STATUS_WEBHOOK_URL` | `oacp`  | MCPLab endpoint for trace completion mirror                   |
| `MCPLAB_SYNC_OACP_ON_STARTUP`     | sidecar | Run `docker/oacp-mcplab-sync.mjs` after platform healthy      |

## Dev mode without MCPLab

When `OACP_MEMORY_BACKEND=memory`, observability persistence is disabled (in-memory only). Use `OACP_MEMORY_BACKEND=sqlite` (Docker default) for persistence.

## Clean reset

```bash
docker compose down -v
docker compose -f MCPLab/docker-compose.yml down -v   # when MCPLab stack is present
```

This removes OACP SQLite volume and MCPLab Postgres — synced history is intentionally cleared.
