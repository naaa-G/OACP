# Observability SSE events (Day 46)

Server-Sent Events stream for incremental Console updates — replaces poll-only detection for message flow and Showcase edge pulses.

## Endpoint

| Method | Path                       | Status                 |
| ------ | -------------------------- | ---------------------- |
| `GET`  | `/v1/observability/events` | **Canonical** (Day 46) |

Advertised in `GET /` API discovery as `api.observability_events`.

## Query parameters

| Param      | Type   | Description                                                                                            |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `trace_id` | UUID   | Optional filter — only events for this trace (+ heartbeats/resync)                                     |
| `after`    | string | Optional explicit resume cursor (first connect). Browser reconnect uses `Last-Event-ID` automatically. |

## Event types

| Event              | When emitted                                                                |
| ------------------ | --------------------------------------------------------------------------- |
| `trace.started`    | First message recorded on a new `trace_id`                                  |
| `message.appended` | Any message sent through the bus (HTTP ingress or agent runtime replies)    |
| `agent.registered` | `POST /agents` succeeds                                                     |
| `trace.completed`  | Root `task_response` (replies to the first message in the trace)            |
| `stream.resync`    | Client cursor not found in ring buffer — client should refetch snapshot     |
| `stream.heartbeat` | Reserved type in client parser; server uses SSE comment keepalive every 15s |

## SSE frame format

```
id: 42
event: message.appended
data: {"id":"42","timestamp":"2026-06-21T…","data":{…}}

```

Shared types: `@oacp/observability-client` (`events.ts`).

## Cursor resume

1. **Same process reconnect** — `Last-Event-ID` replays from the in-memory ring buffer (10k events).
2. **Cursor lost / server restart** — server emits `stream.resync` and, when `trace_id` is set, synthesizes catch-up events from the bus message log.
3. **Client fallback** — Console invalidates TanStack Query snapshot on `stream.resync`.

## Multi-instance fanout (optional)

Set `OACP_OBSERVABILITY_REDIS_URL` to enable Redis pub/sub fanout across server instances (`redis` optional dependency). Default dev mode uses in-memory bus only.

| Variable                           | Default                     | Description          |
| ---------------------------------- | --------------------------- | -------------------- |
| `OACP_OBSERVABILITY_REDIS_URL`     | —                           | Redis connection URL |
| `OACP_OBSERVABILITY_REDIS_CHANNEL` | `oacp:observability:events` | Pub/sub channel      |

## Rate limits

Maximum **10 SSE connections per client IP** (429 when exceeded).

## Console integration

- `@oacp/observability-client` — `connectObservabilityEventStream`, `useObservabilityEvents`
- `apps/console/src/hooks/useObservabilitySseBridge.ts` — `message.appended` → `enqueueShowcaseEdgePulse` + `enqueueMessageFeedAppend` (Day 47)
- `apps/console/src/hooks/useIncrementalMessageFeed.ts` — append-only poll/SSE merge
- Enabled when **Live** toggle is on in Console header

See [console-message-feed.md](./console-message-feed.md) for feed architecture.

## Tests

```bash
pnpm --filter @oacp/server test -- observability-event
pnpm --filter @oacp/observability-client test -- events
```

## Related

- [console-spec.md](./console-spec.md) — snapshot + graph API
- [observability-client.md](./observability-client.md) — client hooks
- [http-server.md](./http-server.md) — server configuration
