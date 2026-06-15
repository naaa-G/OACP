# Remote Agent Hello Example

Week 2 milestone demo: a coordinator talks to a worker over HTTP via `@oacp/server`.

## What it does

1. Starts an OACP reference server (ephemeral port on `127.0.0.1`)
2. Registers a **summarizer** worker on the server's in-memory bus
3. Registers the summarizer in the server **registry** for discovery
4. Uses `AgentClient` as a remote **coordinator** (`sendTask` auto-routes by capability)
5. Polls `GET /agent/:id/messages` for the correlated `task_response`
6. Prints output and `trace_id`

## Run

Integration tests are the canonical verification (CI-safe):

```bash
pnpm --filter @oacp/sdk test -- remote-messaging.integration
pnpm --filter @oacp/server test
```

Optional local script:

```bash
pnpm build
pnpm install
pnpm --filter oacp-examples start:remote
```

## Production pattern

In production, run `@oacp/server` as a separate process (see `pnpm --filter @oacp/server start`)
and point `AgentClient` at its URL. Workers can run on the server node or register via HTTP.

## Related

- [Remote client](../../docs/remote-client.md)
- [HTTP server](../../docs/http-server.md)
- [Multi-agent hello](../multi-agent/README.md) — local in-process variant
