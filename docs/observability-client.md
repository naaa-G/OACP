# Observability client (`@oacp/observability-client`)

Browser-side client for the OACP Console. Fetches the unified **observability snapshot** at `/v1/observability/snapshot` and exposes TanStack Query hooks for live polling.

## Endpoints (Day 6)

| Method | Path                                      | Purpose                                                   |
| ------ | ----------------------------------------- | --------------------------------------------------------- |
| `GET`  | `/v1/observability/snapshot`              | **Canonical** — agents, traces, active trace, graph links |
| `GET`  | `/v1/observability/traces/:traceId/graph` | Trace-scoped agent graph for Ops 2D (Day 26)              |
| `GET`  | `/playground/snapshot`                    | Legacy alias (identical response; deprecated Day 60)      |

See [console-spec.md](./console-spec.md) for the full response schema.

Query parameters:

| Param      | Default | Description             |
| ---------- | ------- | ----------------------- |
| `limit`    | `25`    | Max traces in listing   |
| `trace_id` | —       | Active trace to hydrate |

Response:

```json
{
  "ok": true,
  "snapshot": {
    "server": {
      "status": "healthy",
      "protocol_version": "1.0",
      "registered_agents": 6,
      "bus_open": true
    },
    "agents": [],
    "traces": [],
    "trace_count": 3,
    "active_trace": { "trace_id": "…", "message_count": 12, "timeline": [] },
    "agent_links": []
  }
}
```

## Types

| Type                       | Description                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `PlaygroundSnapshot`       | Full poll payload                                                                                        |
| `AgentObservabilityRecord` | Agent identity + runtime fields (`fleet`, `role`, `status`, `last_seen_at`) from Day 9 server enrichment |
| `TraceBundle`              | Active trace with timeline                                                                               |
| `TraceListEntry`           | Trace summary row                                                                                        |
| `AgentLink`                | Aggregated delegation edge                                                                               |
| `TraceGraphView`           | Trace-scoped agent nodes + edges for Ops graph (Day 26)                                                  |
| `TraceGraphNode`           | Agent node with `depth`, `fleet`, `role`, `status`                                                       |

Defined in `packages/observability-client/src/types.ts` — mirrors `@oacp/server` `playground-service.ts`.

## `fetchSnapshot`

```typescript
import { fetchSnapshot, OBSERVABILITY_SNAPSHOT_PATH } from '@oacp/observability-client';

const snapshot = await fetchSnapshot({
  baseUrl: '', // same origin
  traceId: 'optional-uuid',
  limit: 25,
  snapshotPath: OBSERVABILITY_SNAPSHOT_PATH,
});
```

To call the legacy path during migration:

```typescript
import { LEGACY_PLAYGROUND_SNAPSHOT_PATH } from '@oacp/observability-client';

await fetchSnapshot({ snapshotPath: LEGACY_PLAYGROUND_SNAPSHOT_PATH });
```

Throws `ObservabilityClientError` on network/HTTP failures.

**Legacy fallback (Day 6+):** When `legacyFallback` is `true` (default), a `404` from `/v1/observability/snapshot` retries `/playground/snapshot` once and caches the working path for that API origin. Use this with MCPLab Docker until images include the v1 route.

## `fetchTraceGraph` (Day 26)

Trace-scoped agent graph for Ops 2D layout — participants only, not the full registry.

```typescript
import { fetchTraceGraph } from '@oacp/observability-client';

const graph = await fetchTraceGraph({
  baseUrl: '',
  traceId: '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b',
});

// graph.layout === 'hierarchical'
// graph.nodes[].depth — BFS depth for dagre layout (Day 27)
```

See [console-spec.md](./console-spec.md#trace-agent-graph-day-26) for the response schema.

## React hooks

### `useSnapshot`

```typescript
const { data, error, isLoading, refetch, isFetching } = useSnapshot({
  traceId: undefined,
  limit: 25,
  pollIntervalMs: 1500, // false = manual refresh only
  enabled: true,
});
```

Query key: `['oacp-snapshot', baseUrl, snapshotPath, traceId, limit]`

### `useTraces`

Thin wrapper — returns `traces` and `traceCount` from the same snapshot query (no extra HTTP round trip).

```typescript
const { traces, traceCount, isLoading } = useTraces({ pollIntervalMs: 3000 });
```

### `useTraceGraph` (Day 27)

Polls the trace-scoped graph endpoint for Ops 2D layout. Separate query from snapshot — only fetches when `enabled` and `traceId` are set.

```typescript
const { data, error, isLoading, isFetching } = useTraceGraph({
  traceId: selectedTraceId,
  pollIntervalMs: 1500, // false = manual refresh only
  enabled: graphMode === 'ops',
});
```

Query key: `['oacp-trace-graph', baseUrl, traceId]`

### `snapshotStats`

```typescript
import { snapshotStats } from '@oacp/observability-client';

const { agentCount, traceCount, messageCount } = snapshotStats(snapshot);
```

| Field          | Source                                       |
| -------------- | -------------------------------------------- |
| `agentCount`   | `snapshot.server.registered_agents`          |
| `traceCount`   | `snapshot.trace_count`                       |
| `messageCount` | `snapshot.active_trace.message_count` or `0` |

### `activeAgentsFromTrace`

Derives the set of agent IDs participating in a trace (roster + timeline `from` / `to`). Used by the Console agent list for **active** highlighting — same logic as the legacy playground.

```typescript
import { activeAgentsFromTrace } from '@oacp/observability-client';

const activeIds = activeAgentsFromTrace(snapshot.active_trace);
const isActive = activeIds.has(agent.id);
```

**Note:** Prefer `agent.status` from the server when present (`active`, `error`, `idle`). `activeAgentsFromTrace` remains useful for client-side highlighting when `status` is absent (older servers).

### `shortAgentId`

Strips the `agent://` prefix for compact labels when `agent.name` is empty.

```typescript
import { shortAgentId } from '@oacp/observability-client';

shortAgentId('agent://mcplab-planner'); // "mcplab-planner"
```

### Trace URL helpers (Day 5)

Pure functions for deep links — no React dependency.

```typescript
import {
  TRACE_ID_QUERY_PARAM,
  buildConsoleTraceUrl,
  buildTraceDeepLink,
  readAgentIdFromSearch,
  readTraceIdFromSearch,
  syncSelectionToSearch,
  writeTraceIdToSearch,
} from '@oacp/observability-client';

readTraceIdFromSearch('?trace_id=abc&mode=showcase'); // "abc"
readAgentIdFromSearch('?agent=agent%3A%2F%2Fmcplab-planner'); // "agent://mcplab-planner"
syncSelectionToSearch('?mode=legacy', {
  traceId: 'trace-1',
  agentId: 'agent://mcplab-planner',
});
writeTraceIdToSearch('?mode=ops', 'trace-1'); // "?mode=ops&trace_id=trace-1"
buildTraceDeepLink('uuid'); // "/console/?trace_id=uuid&mode=showcase"
buildConsoleTraceUrl('http://127.0.0.1:3001', 'uuid');
// "http://127.0.0.1:3001/console/?trace_id=uuid&mode=showcase"
```

### Error messages and connection status (Day 14)

```typescript
import {
  formatObservabilityError,
  resolveConnectionStatus,
  ObservabilityClientError,
} from '@oacp/observability-client';

formatObservabilityError(new ObservabilityClientError('Failed to fetch', { status: 0 }));
// → { title: 'OACP server unreachable', message, hint, status: 0 }

resolveConnectionStatus({
  isError: true,
  isFetching: true,
  isLoading: false,
  hasSnapshot: false,
}); // "reconnecting"
```

### Trace display helpers (Day 5)

```typescript
import {
  formatTraceActivityTime,
  formatTraceListMeta,
  shortTraceId,
} from '@oacp/observability-client';

shortTraceId('0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b'); // "0c8f1e2a…"
formatTraceListMeta(trace); // "12 msgs · 5 agents"
formatTraceActivityTime(trace.lastActivityAt); // "2 min ago"
```

### Timeline feed helpers (Day 8)

```typescript
import {
  FEED_TAIL_LIMIT,
  formatTimelineRoute,
  tailTimelineEvents,
  timelineFeedStatus,
} from '@oacp/observability-client';

const rows = tailTimelineEvents(trace.timeline); // last 40 events
formatTimelineRoute(event); // "agent://a → agent://b · capability"
timelineFeedStatus(event); // "success" | "error" | "neutral"

// Day 49 — virtual feed tail (Console)
import { FEED_VIRTUAL_TAIL_LIMIT } from '@oacp/observability-client';

// Day 47 — append-only feed merge (Console + SSE)
import {
  mergeTimelineEventsAppendOnly,
  timelineEventFromMessageAppended,
} from '@oacp/observability-client';

const { rows, appendedMessageIds } = mergeTimelineEventsAppendOnly(existing, incoming, 40);
```

## Provider

```tsx
<ObservabilityProvider
  config={{
    baseUrl: import.meta.env.VITE_OACP_API_BASE ?? '',
    snapshotPath: '/playground/snapshot',
  }}
>
  <ConsoleLayout />
</ObservabilityProvider>
```

| Config         | Default                      | Description                                   |
| -------------- | ---------------------------- | --------------------------------------------- |
| `baseUrl`      | `''`                         | API origin (empty = same origin / Vite proxy) |
| `snapshotPath` | `/v1/observability/snapshot` | Snapshot endpoint path                        |
| `fetchImpl`    | `fetch`                      | Inject for tests                              |

## Console integration

`apps/console` wraps the app in `ConsoleProviders` (`QueryClient` + `ObservabilityProvider`). `ConsoleLayout` uses `useConsoleSnapshot` (Day 5) for trace selection, URL `?trace_id=` sync, and live polling. `AgentsPanel` maps `snapshot.agents` to `AgentCard` rows and highlights agents returned by `activeAgentsFromTrace(snapshot.active_trace)`. `TraceRail` lists `snapshot.traces` and calls `selectTrace` on row click.

### Dev proxy

Vite proxies `/v1` and `/playground` → `http://127.0.0.1:3000`. Start the reference server:

```bash
pnpm --filter @oacp/server start
pnpm --filter @oacp/console dev
```

### Remote server (MCPLab Docker on :3001)

MCPLab Docker images may ship an older OACP server with only `/playground/snapshot`. The observability client **automatically falls back** to the legacy path when v1 returns `404` — no configuration required.

```bash
# Optional: point Console directly at Docker (bypasses Vite proxy)
# apps/console/.env.local
VITE_OACP_API_BASE=http://127.0.0.1:3001
```

With the default Vite dev setup, `vite.config.ts` proxies `/v1` and `/playground` to `http://127.0.0.1:3001`.

## Testing

```bash
pnpm --filter @oacp/observability-client test
```

Unit tests mock `fetch` for `fetchSnapshot` and `snapshotStats`.

## SSE event stream (Day 46)

Connect to `GET /v1/observability/events` for incremental updates (message flow, Showcase edge pulses).

```tsx
import {
  connectObservabilityEventStream,
  useObservabilityEvents,
  OBSERVABILITY_EVENTS_PATH,
} from '@oacp/observability-client';

useObservabilityEvents({
  traceId: selectedTraceId,
  enabled: liveEnabled,
  onEvent: (event) => {
    if (event.type === 'message.appended') {
      // incremental feed / graph pulse
    }
  },
  onResync: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_QUERY_KEY }),
});
```

Browser reconnect sends `Last-Event-ID` automatically. First connect may pass `?after=` via `afterEventId` option.

Full protocol: [observability-events.md](./observability-events.md).

## Roadmap

| Day    | Change                                                                                       |
| ------ | -------------------------------------------------------------------------------------------- |
| Day 3  | Snapshot hooks ✅                                                                            |
| Day 4  | `activeAgentsFromTrace`, agent list in Console ✅                                            |
| Day 5  | Trace URL helpers, trace rail selection ✅                                                   |
| Day 6  | Migrate to `GET /v1/observability/snapshot` ✅                                               |
| Day 8  | Timeline feed helpers (`tailTimelineEvents`) ✅                                              |
| Day 9  | Server agent enrichment (`fleet`, `role`, `status`, `last_seen_at`); Console fleet badges ✅ |
| Day 10 | Legacy SVG ring graph (`VITE_GRAPH_MODE`); Playwright smoke ✅                               |
| Day 11 | MCPLab fleet/role metadata helpers + server inference ✅                                     |
| Day 46 | `GET /v1/observability/events` SSE stream ✅                                                 |
| Day 47 | `mergeTimelineEventsAppendOnly`, `timelineEventFromMessageAppended` ✅                       |
| Day 49 | `FEED_VIRTUAL_TAIL_LIMIT` for virtualized Console feed ✅                                    |

## Related

- [console.md](./console.md)
- [console-spec.md](./console-spec.md)
- [console-message-feed.md](./console-message-feed.md)
- [console-architecture.md](./console-architecture.md)
- [observability.md](./observability.md)
- [playground.md](./playground.md)
