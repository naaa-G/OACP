# Demo v1 — Network Collaboration (Day 14)

Three agents collaborate over **real HTTP**: a remote coordinator sends a document through
**Orchestrator → Analyzer → Reporter** on an OACP server node.

## Quick run

From the repository root (after `pnpm install`):

```bash
pnpm build
pnpm --filter oacp-examples start:demo
```

## What you should see

- Server URL and worker registration
- Capability discovery for `document.pipeline`
- Structured output with `incident_id`, `severity`, `summary`, and `report`
- A single **trace ID** spanning the full A → B → C chain
- A message timeline (`task_request` / `task_response` pairs)

## Environment variables

| Variable             | Default                                  | Description                     |
| -------------------- | ---------------------------------------- | ------------------------------- |
| `OACP_HOST`          | `127.0.0.1`                              | Server bind host                |
| `OACP_PORT`          | `0` (ephemeral)                          | Server listen port              |
| `OACP_TIMEOUT_MS`    | `15000`                                  | HTTP client timeout (ms)        |
| `OACP_DEMO_DOCUMENT` | `INC-1042: latency spike in payment API` | Input document for the pipeline |

## CI smoke mode

```bash
pnpm build
pnpm --filter oacp-examples start:demo -- --verify
```

Exits `0` when output and trace depth match expectations.

## Architecture

See [docs/demo-v1.md](../../docs/demo-v1.md) for the sequence diagram and Week 2 feature map.

## Related examples

| Script           | Scope                          |
| ---------------- | ------------------------------ |
| `start:local`    | In-process two-agent flow      |
| `start:remote`   | Single remote worker           |
| `start:pipeline` | Local A → B → C chain          |
| `start:demo`     | **Network** A → B → C (Day 14) |
