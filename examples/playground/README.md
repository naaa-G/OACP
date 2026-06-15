# OACP Playground

The **playground** is OACP's live visualization layer — agents as nodes, message flow, and delegation topology updating in real time.

## Quick start

```bash
pnpm build
pnpm --filter oacp-examples start:playground
```

Open the URL printed in the terminal (default `http://127.0.0.1:3000/playground`).

On start, the demo **automatically runs one Autonomous Startup Team workflow** so the playground is populated. Use `--loop` for continuous demos.

### Options

| Flag / env            | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `--loop`              | Re-run startup team every 20s for continuous demo   |
| `--idle`              | Skip initial workflow (manual: run `start:startup`) |
| `OACP_PORT`           | Listen port (default `3000`)                        |
| `OACP_STARTUP_PROMPT` | Product prompt (default: habit tracker)             |

### With an existing server

If `@oacp/server` is already running with registered agents:

1. Start the server: `pnpm --filter @oacp/server start`
2. Run a demo in another terminal: `pnpm --filter oacp-examples start:startup`
3. Open `http://127.0.0.1:3000/playground?trace_id=<uuid>` from the demo output

## What you see

- **Registered agents** — identity, capabilities, highlight when active in the selected trace
- **Delegation graph** — agent nodes and subtask/delegation edges (SVG)
- **Message flow** — live timeline feed with success/error styling
- **Recent traces** — click to switch the active trace

Enable **Live** mode to poll `GET /playground/snapshot` automatically.

## HTTP API

Served by `@oacp/server`:

| Endpoint                                    | Description                     |
| ------------------------------------------- | ------------------------------- |
| `GET /playground`                           | Web UI                          |
| `GET /playground/snapshot?trace_id=&limit=` | Unified poll payload for the UI |

See [docs/playground.md](../../docs/playground.md) for architecture and enterprise usage.

## Related

- [Startup team](../startup-team/README.md) — flagship Day 23 workload
- [Demo v2](../demo-v2/README.md) — incident-response DAG
- [Trace viewer](../observability/trace-viewer.ts) — CLI + Day 20 diagnostic UI at `/trace-viewer`
