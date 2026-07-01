# @oacp/console

**OACP Console** — enterprise observability UI for live agent collaboration (replacing the legacy playground).

## Development

```bash
# From repo root
pnpm install
pnpm --filter @oacp/ui build
pnpm --filter @oacp/observability-client build
pnpm --filter @oacp/console dev
```

Open http://127.0.0.1:5173 — polls `GET /v1/observability/snapshot` (legacy `/playground/snapshot` fallback supported).

### MCPLab Docker (`:3001`)

Default Vite proxy targets `http://127.0.0.1:3001`. Override for local server or CI:

```bash
# Local reference server on :3847
VITE_OACP_API_PROXY=http://127.0.0.1:3847 pnpm --filter @oacp/console dev
```

### Graph mode (Day 10)

| `VITE_GRAPH_MODE`  | Renderer                                       |
| ------------------ | ---------------------------------------------- |
| `legacy` (default) | Circular SVG ring graph (playground parity)    |
| `ops`              | React Flow hierarchical DAG (Week 7 complete)  |
| `showcase`         | Three.js force layout + OrbitControls (Day 37) |

### Selection (Day 13)

Zustand store (`src/store/selection-store.ts`) — click agent cards to toggle selection; URL syncs `?agent=` + `?trace_id=`. Selection survives live poll refresh.

### Role taxonomy (Day 18)

```bash
pnpm --filter @oacp/console test -- role-taxonomy
pnpm --filter @oacp/console test:e2e --grep "Role taxonomy"
```

### Agent search (Day 19)

Fuzzy client-side search with debounced filtering (`120ms`), substring highlights, clear button, and `/` keyboard shortcut.

```bash
pnpm --filter @oacp/console test -- agent-search
pnpm --filter @oacp/console test:e2e --grep "Agent search"
```

### Catalog filters + sort (Day 20)

Status, fleet, and in-trace filter chips plus sort (name, last seen, activity in trace). Filters compose with search and persist in `sessionStorage` (`oacp.console.catalogFilters.v1`).

```bash
pnpm --filter @oacp/console test -- agent-catalog-filter
pnpm --filter @oacp/console test:e2e --grep "Agent catalog filters"
```

### Agent detail drawer (Day 21)

Slide-over panel on agent card click: identity, capabilities, recent traces, and last 10 messages in the current trace. Escape and backdrop dismiss; graph/feed stay visible.

```bash
pnpm --filter @oacp/console test -- agent-detail
pnpm --filter @oacp/console test:e2e --grep "Agent detail drawer"
```

Optional MCPLab lab base override:

```bash
$env:VITE_MCPLAB_LAB_URL = "http://127.0.0.1:8080"
pnpm --filter @oacp/console dev
```

### Cross-panel linking (Day 22)

Agent selection highlights the graph node, emphasizes connected edges, and filters the message feed. **Clear selection** in the header restores the full feed.

```bash
pnpm --filter @oacp/console test -- timeline-agent-filter
pnpm --filter @oacp/console test:e2e --grep "Cross-panel linking"
```

### Virtualized agent list (Day 23)

TanStack Virtual catalog with compact/detailed density modes. Compact shows role + short id; detailed shows full URI + capabilities. Density persists in `sessionStorage`.

```bash
pnpm --filter @oacp/console test -- virtual-agent-rows
pnpm --filter @oacp/console test:e2e --grep "Virtualized agent list"
```

### Pin + row actions (Day 24)

Pin up to five agents to a **Pinned** section at the top (`localStorage`: `oacp.console.pinnedAgents.v1`). Row **⋯** menu: copy URI, filter feed, focus in graph, pin/unpin. Row actions link graph + feed without opening the detail drawer.

```bash
pnpm --filter @oacp/console test -- pinned-agents
pnpm --filter @oacp/console test:e2e --grep "Agent pins"
```

### Agent catalog test suite (Day 25)

Issue **#1** closed. Consolidated pipeline tests + full catalog Playwright suite.

```bash
pnpm --filter @oacp/console test -- agent-catalog-pipeline
pnpm --filter @oacp/console test:e2e:catalog
```

Usability checklist: [docs/console-spec.md](../../docs/console-spec.md#agent-catalog-usability-checklist-day-25)

### Ops 2D graph (Day 27)

Hierarchical React Flow graph for dense trace debugging. Enable via `VITE_GRAPH_MODE=ops` or `?mode=ops` on the dev URL.

```bash
# Dev — Ops mode
VITE_GRAPH_MODE=ops pnpm --filter @oacp/console dev

# Unit — dagre layout + overlap guard
pnpm --filter @oacp/console test -- ops-graph-layout

# E2E — hierarchy + cross-panel selection
pnpm --filter @oacp/console test:e2e --grep "Ops 2D"
```

Data: `GET /v1/observability/traces/:traceId/graph` via `useTraceGraph` in `@oacp/observability-client`. See [docs/console-spec.md](../../docs/console-spec.md#trace-agent-graph-day-26).

### Ops graph labels (Day 28)

Dense traces stay readable: circle nodes only by default. Hover for tooltip; click node to pin one label (`Escape` clears).

```bash
pnpm --filter @oacp/console test -- ops-graph-label
pnpm --filter @oacp/console test:e2e --grep "Day 28"
```

### Ops edge styling (Day 29)

Bezier delegation edges with kind colors, message-weighted stroke width, arrow markers, and hover tooltips. Legend in graph panel footer.

```bash
pnpm --filter @oacp/console test -- ops-graph-edge
pnpm --filter @oacp/console test:e2e --grep "Day 29"
```

### Ops active node styling (Day 30)

Active agents: larger + glow + pulse. Idle: smaller + muted. Selection ring syncs with catalog. Week 6 ops graph complete.

```bash
pnpm --filter @oacp/console test -- ops-graph-node-style
pnpm --filter @oacp/console test:e2e --grep "Day 30"
```

### Ops graph sign-off (Day 35)

Week 7 Ops 2D complete — legend, depth, perf guard, MCPLab e2e, 30-agent visual baseline.

```bash
pnpm --filter @oacp/console test:e2e --grep "Day 35"
```

### Showcase 3D layouts + presentation + Ops sync (Day 37–44)

Trace graph API drives **Force** or **Sphere** layouts. **Day 43:** presentation mode. **Day 44:** Ops ↔ Showcase selection sync + **PNG** export (1920×1080).

```bash
pnpm --filter @oacp/console test -- graph-png-export
pnpm --filter @oacp/console test:e2e --grep "Day 44|Showcase \\+ Ops sync"
```

**PNG export:** **PNG** button in Delegation graph header (Ops or Showcase modes).

**Hero screenshot** (regenerate README asset):

```bash
# PowerShell
$env:CAPTURE_HERO='1'; pnpm --filter @oacp/console capture:hero

# bash
CAPTURE_HERO=1 pnpm --filter @oacp/console capture:hero
```

Outputs: `apps/console/public/showcase-hero.png` and `docs/public/screenshots/console-showcase-hero.png`.

### Fleet grouping (Day 17)

Agents render under collapsible fleet headers: **MCPLab**, **Startup demo**, **System**, **External**. Unknown/missing `fleet` values bucket to **External**. Each card has a fleet-colored left ring (`--oacp-fleet-*` tokens). Collapse state persists in `sessionStorage`.

```bash
pnpm --filter @oacp/console test -- fleet-catalog
pnpm --filter @oacp/console test:e2e --grep "Fleet grouping"
```

### Showcase sign-off (Day 45 — Issue #2 closed)

```bash
pnpm --filter @oacp/console test -- showcase-performance-budget
pnpm --filter @oacp/console test:e2e:showcase
```

See [console-performance-budget.md](../../docs/console-performance-budget.md) and [console-showcase-qa-checklist.md](../../docs/console-showcase-qa-checklist.md).

### SSE event stream (Day 46)

Live mode connects to `GET /v1/observability/events` and routes `message.appended` to Showcase edge pulses.

```bash
pnpm --filter @oacp/observability-client test -- events
pnpm --filter @oacp/server test -- observability-event
```

See [observability-events.md](../../docs/observability-events.md).

### Message feed sign-off (Day 50 — Issue #3 closed)

```bash
pnpm --filter @oacp/observability-client test -- timeline-feed trace-format reconcile
pnpm --filter @oacp/console test -- timeline-export
pnpm --filter @oacp/console test:e2e:feed
```

Live mode is **SSE-primary** with **30s snapshot reconcile** (header: Reconcile 15s / 30s / 60s). See [console-message-feed.md](../../docs/console-message-feed.md) and [console-message-feed-qa-checklist.md](../../docs/console-message-feed-qa-checklist.md).

### Trace-scoped agent list (Day 16)

Default: only agents **in the selected trace**. Toggle **Show all registered** to browse the full registry (dimmed out-of-trace rows). Scope badge: `2 of 27 agents`.

```bash
pnpm --filter @oacp/console test -- agent-trace-filter
pnpm --filter @oacp/console test:e2e --grep "Agent catalog"
```

### Message feed (Day 47–49)

Append-only incremental feed with virtual list, hover pause, expandable rows, and client-side filters.

```bash
pnpm --filter @oacp/console test -- message-feed-filter message-feed-detail
pnpm --filter @oacp/console test:e2e --grep "message feed"
```

See [docs/console-message-feed.md](../../docs/console-message-feed.md).

### Errors and connection status (Day 14)

- `formatObservabilityError()` — maps network / 401 / 500 to banner copy
- Header badges: **Connected** | **Reconnecting** | **Offline**
- `ConsoleErrorBoundary` — render crash fallback

```text
http://127.0.0.1:5173/?trace_id=<uuid>&agent=agent://mcplab-planner-crew-demo&mode=legacy
```

## Tests

```bash
# Unit — ring layout
pnpm --filter @oacp/console test

# E2E — Playwright smoke (mocked snapshot API)
# Stop any running `pnpm dev` first to avoid port conflicts.
pnpm --filter @oacp/console test:e2e

# Optional — custom e2e port (default 5174)
$env:CONSOLE_E2E_PORT = "5190"
pnpm --filter @oacp/console test:e2e
```

### CI failure logs

GitHub Actions uploads `console-e2e-report` on every E2E run (pass or fail):

| Artifact                       | Purpose                                 |
| ------------------------------ | --------------------------------------- |
| `test-results/e2e-errors.md`   | Human-readable failure summary          |
| `test-results/e2e-errors.json` | Machine-readable failure list           |
| `test-results/results.json`    | Full Playwright JSON report             |
| `playwright-report/`           | HTML report (open `index.html` locally) |

Playwright runs the **full suite** even when tests fail (`maxFailures: 0`).

## Build

```bash
pnpm --filter @oacp/console build
```

Output: `apps/console/dist/` (served by `@oacp/server` at `/console` from Day 7).

## Documentation

- [docs/console-message-feed.md](../../docs/console-message-feed.md)
- [docs/console.md](../../docs/console.md)
- [docs/console-performance-budget.md](../../docs/console-performance-budget.md)
- [docs/console-showcase-qa-checklist.md](../../docs/console-showcase-qa-checklist.md)
- [docs/mcplab-full-loop.md](../../docs/mcplab-full-loop.md) — Day 15 full-loop verification
- [docs/console-components.md](../../docs/console-components.md)
- [docs/version1.md](../../docs/version1.md) — 60-day build plan
