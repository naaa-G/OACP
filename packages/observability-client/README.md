# @oacp/observability-client

Typed HTTP client and **TanStack Query** hooks for the OACP Console observability snapshot API.

## Install

Workspace package — consumed by `@oacp/console`:

```json
{
  "dependencies": {
    "@oacp/observability-client": "workspace:*",
    "@tanstack/react-query": "^5.64.2"
  }
}
```

Peer dependencies: `react`, `@tanstack/react-query`.

## Quick start

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ObservabilityProvider, useSnapshot, snapshotStats } from '@oacp/observability-client';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ObservabilityProvider config={{ baseUrl: '' }}>
        <Dashboard />
      </ObservabilityProvider>
    </QueryClientProvider>
  );
}

function Dashboard() {
  const { data, isLoading, error } = useSnapshot({ pollIntervalMs: 1500 });
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>{error.message}</p>;
  const stats = snapshotStats(data);
  return <p>Agents: {stats.agentCount}</p>;
}
```

## API

| Export                  | Description                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| `fetchSnapshot`         | Imperative snapshot client (`/v1/observability/snapshot` with legacy fallback)  |
| `fetchTraceGraph`       | `GET /v1/observability/traces/:traceId/graph` — trace-scoped agent DAG (Day 26) |
| `useSnapshot`           | React Query hook with optional polling                                          |
| `useTraces`             | Trace list derived from snapshot                                                |
| `useTraceGraph`         | Polls trace graph for Ops 2D layout (Day 27)                                    |
| `snapshotStats`         | Header stat tile helper                                                         |
| `ObservabilityProvider` | `baseUrl`, custom `fetch`                                                       |

Full reference: [docs/observability-client.md](../../docs/observability-client.md)

## Development

```bash
pnpm --filter @oacp/observability-client build
pnpm --filter @oacp/observability-client test
```
