# OACP Console

The **OACP Console** is the v1.0 observability UI for multi-agent collaboration. It shows registered agents, delegation topology, and live message flow — the product surface that replaces the legacy [playground](./playground.md).

MCPLab is the flagship demo target: crews run against `@oacp/server` and open the Console in **Showcase** mode with a `trace_id`.

## User guide

### Modes

| Mode            | URL              | Best for                                            |
| --------------- | ---------------- | --------------------------------------------------- |
| **Showcase**    | `?mode=showcase` | Demos, README hero, conferences (3D fleet graph)    |
| **Ops**         | `?mode=ops`      | Delegation drill-down, incident crews, dense traces |
| **Legacy ring** | `?mode=legacy`   | Week 2 SVG graph (deprecated for launch)            |

Default graph mode can be set at build time with `VITE_GRAPH_MODE`.

### URL parameters

| Param             | Example                   | Purpose                                |
| ----------------- | ------------------------- | -------------------------------------- |
| `trace_id`        | `?trace_id=abeaa66c-…`    | Pre-select trace                       |
| `mode`            | `?mode=showcase`          | Graph renderer                         |
| `showcase_layout` | `sphere` / `force`        | Showcase layout                        |
| `showcase_fleet`  | `mcplab`                  | Fleet filter in Showcase               |
| `showcase_bloom`  | `low` / `medium` / `high` | Bloom intensity                        |
| `presentation`    | `1`                       | Presentation chrome (hide side panels) |

**MCPLab deep link example:**

```text
http://127.0.0.1:3847/console/?trace_id=<uuid>&mode=showcase&showcase_fleet=mcplab&presentation=1
```

Build links in SDK: `buildConsoleTraceUrl()` from `@oacp/sdk`.

### Agent catalog

- **Trace-scoped default** — when a trace is selected, only participating agents are highlighted
- **Fleet sections** — MCPLab, Startup demo, System, External
- **Custom fleets** — unknown `metadata.fleet` values bucket to **External**; configure display names at build time:

```bash
VITE_OACP_CONSOLE_FLEETS='{"custom-demo":"Custom demo","acme-corp":"Acme Corp"}' pnpm --filter @oacp/console build
```

Custom fleet ids listed in that JSON get their **own catalog section** (before External).

### Trace rail

The bottom **Recent traces** panel supports:

| Scope                    | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| **All synced** (default) | Full trace history including MCPLab backfill |
| **Live only**            | Traces with `status=running`                 |

Selection persists in `sessionStorage` for the browser session.

### MCPLab integration

- Agents must register with `metadata.fleet=mcplab` and a `metadata.role`
- MCPLab web and CLI emit Console deep links on crew completion
- After OACP container recreate, traces backfill from MCPLab Postgres — see [mcplab.md](./mcplab.md#sync-troubleshooting)

### Bring your own agents

No MCPLab required — see [bring-your-own-agents.md](./bring-your-own-agents.md):

```bash
pnpm --filter oacp-examples start:custom-agents
```

## Status

| Milestone                                              | State                                                   |
| ------------------------------------------------------ | ------------------------------------------------------- |
| Day 1 — scaffold + design tokens                       | ✅                                                      |
| Day 2 — layout shell + UI primitives                   | ✅                                                      |
| Day 3 — observability client + live stats              | ✅                                                      |
| Day 4 — read-only agent list + active highlight        | ✅                                                      |
| Day 5 — trace rail selection + `?trace_id=` deep links | ✅                                                      |
| Day 6 — `/v1/observability/snapshot` API               | ✅                                                      |
| Day 7 — server serves `/console` static bundle         | ✅                                                      |
| Day 8 — message feed + graph loading placeholder       | ✅                                                      |
| Day 9 — server agent enrichment + fleet/role badges    | ✅                                                      |
| Day 10 — legacy SVG ring graph + Playwright smoke      | ✅                                                      |
| Day 11 — MCPLab fleet/role metadata + badges           | ✅                                                      |
| Day 12 — MCPLab Console deep links                     | ✅ See [mcplab-integration.md](./mcplab-integration.md) |
| Day 13 — cross-panel selection (Zustand)               | ✅                                                      |
| Day 14 — error boundaries + empty states               | ✅                                                      |
| Day 15 — MCPLab full-loop vs Console                   | ✅ See [mcplab-full-loop.md](./mcplab-full-loop.md)     |
| Day 16 — trace-scoped agent default                    | ✅                                                      |
| Day 17 — fleet grouping                                | ✅                                                      |
| Day 18 — role taxonomy                                 | ✅                                                      |
| Day 19 — agent search                                  | ✅                                                      |
| Day 20 — catalog filters + sort                        | ✅                                                      |
| Day 21 — agent detail drawer                           | ✅                                                      |
| Day 22 — cross-panel linking                           | ✅                                                      |
| Day 23 — virtualized agent list                        | ✅                                                      |
| Day 24 — pin + row actions                             | ✅                                                      |
| Day 25 — agent catalog tests (Issue #1 closed)         | ✅                                                      |
| Day 26 — trace graph API (server)                      | ✅                                                      |
| Day 27 — Ops 2D React Flow graph                       | ✅                                                      |
| Day 28 — Ops graph label strategy                      | ✅                                                      |
| Day 29 — Ops edge routing + styling                    | ✅                                                      |
| Day 30 — Ops active node styling                       | ✅                                                      |
| Day 31 — Ops zoom, pan, fit-to-view                    | ✅                                                      |
| Day 32 — Ops graph focus mode                          | ✅                                                      |
| Day 33 — Trace replay scrubber                         | ✅                                                      |
| Day 34 — Registry ghost nodes                          | ✅                                                      |
| Day 35 — Ops graph sign-off                            | ✅                                                      |
| Day 36 — Showcase 3D scaffold                          | ✅                                                      |
| Day 37 — Showcase 3D force layout                      | ✅                                                      |
| Day 38 — Sphere constellation layout                   | ✅                                                      |
| Day 39 — Showcase hover labels + selection             | ✅                                                      |
| Day 40 — Showcase edge animation                       | ✅                                                      |
| Day 41 — Post-processing bloom                         | ✅                                                      |
| Day 42 — Fleet clustering in 3D                        | ✅                                                      |
| Day 43 — Presentation mode                             | ✅                                                      |
| Day 44 — Showcase + Ops sync                           | ✅                                                      |
| Day 45 — Showcase tests + Issue #2 sign-off            | ✅                                                      |
| Day 46 — SSE endpoint                                  | ✅                                                      |

**Week 10** (Message flow + SSE) in progress — Day 46 SSE stream live; incremental feed (Day 47) next. See [observability-events.md](./observability-events.md).

Open http://127.0.0.1:5173 — the Console polls **`GET /v1/observability/snapshot`** when the OACP server is running (legacy `/playground/snapshot` remains compatible). The **Registered agents** panel lists every agent (name, URI, capabilities) and highlights agents participating in the selected trace. The **Recent traces** rail lists trace summaries; click a row to switch traces and update agent highlights.

Full API contract: [console-spec.md](./console-spec.md).

## Quick start (development)

```bash
pnpm install
pnpm --filter @oacp/ui build
pnpm --filter @oacp/console dev
```

**Day 1** token preview: `apps/console/src/pages/TokenPreview.tsx` (reference).  
**Day 2+** default view is the Console layout shell.

See [console-components.md](./console-components.md) for `@oacp/ui` API reference.  
See [observability-client.md](./observability-client.md) for snapshot client and hooks.

### With live OACP server (Day 3+)

```bash
# Terminal 1 — reference server
pnpm --filter @oacp/server start

# Terminal 2 — Console dev (proxies /v1 and /playground — see vite.config.ts)
pnpm --filter @oacp/console dev
```

**MCPLab Docker (`:3001`):** Set the Vite proxy target to `http://127.0.0.1:3001` in `apps/console/vite.config.ts`. Older Docker images only expose `/playground/snapshot`; the client auto-falls back when v1 returns `404`.

Run MCPLab or `pnpm oacp run "build todo app"` to produce traces. Agents active in the latest trace show an **Active** badge and accent border.

### Agent list (Day 4)

| State                                      | Behavior                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Loading**                                | Skeleton cards + status message while the first snapshot loads                                                                   |
| **Empty**                                  | “No agents registered” when the registry is empty                                                                                |
| **Error**                                  | Inline panel error + dismissible header banner when the server is unreachable                                                    |
| **Active highlight**                       | Agents in the selected trace (roster + timeline participants) sort to the top with accent styling                                |
| **Fleet / role badges** (Day 9/11)         | Cyan **mcplab** fleet badge + role pill when snapshot includes enrichment (explicit metadata or `agent://mcplab-*` inference)    |
| **Agent search** (Day 11 preview / Day 19) | Fuzzy client-side search across name, URI, fleet, role, capabilities; debounced filter                                           |
| **Search highlights** (Day 19)             | Matching substrings highlighted in name, URI, and capability pills                                                               |
| **Search shortcut** (Day 19)               | Press `/` to focus search (outside text fields)                                                                                  |
| **Trace-scoped default** (Day 16)          | With a trace selected, list **and delegation graph** show only trace participants; **Show all registered** reveals full registry |
| **Fleet grouping** (Day 17)                | Collapsible fleet sections (`MCPLab`, `Startup demo`, `System`, `External`); unknown fleets bucket to **External**               |
| **Fleet color ring** (Day 17)              | Left border on each agent card matches fleet identity token                                                                      |
| **Role badge** (Day 18)                    | Icon + label chip per agent (`◎ Coordinator`, `{}` Coder); fleet-toned colors                                                    |
| **Role legend** (Day 18)                   | Footer shows distinct roles in the current filtered view                                                                         |
| **Role inference** (Day 18)                | Metadata → identity slug → capability prefix fallback                                                                            |
| **Scope count** (Day 16)                   | `2 of 27 agents · In current trace` when filtered; dimmed cards for out-of-trace rows when expanded                              |
| **Catalog filters** (Day 20)               | Status, fleet, and in-trace chips; sort by name, last seen, or trace activity                                                    |
| **Filter persistence** (Day 20)            | Filter + sort state stored in `sessionStorage` for the browser session                                                           |
| **Agent detail drawer** (Day 21)           | Slide-over identity/capabilities/traces/messages panel on card click                                                             |
| **Cross-panel linking** (Day 22)           | Agent selection highlights graph + filters message feed; header **Clear selection**                                              |
| **Virtualized catalog** (Day 23)           | TanStack Virtual list; compact/detailed density toggle (sessionStorage)                                                          |
| **Status badge** (Day 9)                   | **Active** or **Error** from server `agent.status` when the selected trace includes that agent                                   |

Trace auto-selection (most recent trace) applies when no `trace_id` is in the URL. Explicit selection and deep links are available on **Day 5**.

### Fleet grouping (Day 17)

When multiple fleets are registered (e.g. MCPLab + Autonomous Startup Team), the agent catalog groups rows under **collapsible fleet headers**:

| Fleet bucket   | Display name | Card ring color                  |
| -------------- | ------------ | -------------------------------- |
| `mcplab`       | MCPLab       | Cyan (`--oacp-fleet-mcplab`)     |
| `startup-demo` | Startup demo | Amber (`--oacp-fleet-startup`)   |
| `system`       | System       | Slate (`--oacp-fleet-system`)    |
| `external`     | External     | Purple (`--oacp-fleet-external`) |

- **Unknown or missing `fleet`** → `external` bucket (agents still show their raw fleet badge when present).
- **Header** shows fleet name + agent count + collapse chevron; collapse state persists in `sessionStorage` for the browser session.
- **Trace scope** (Day 16) still applies: default view shows only trace participants, grouped within visible fleets.
- **Search** filters agents first, then renders non-empty fleet sections only.

Grouping logic: `apps/console/src/utils/fleet-catalog.ts` (`resolveFleetBucket`, `groupAgentsByFleet`).

### Role taxonomy (Day 18)

Each agent card shows a **compact role badge** (glyph + label) beside the fleet badge. Role colors are derived from the fleet identity token so planners and coders stay visually distinct within the same fleet.

| Resolution order | Source                   | Example                            |
| ---------------- | ------------------------ | ---------------------------------- |
| 1                | `agent.role` metadata    | `role: "planner"`                  |
| 2                | Agent URI / display name | `agent://mcplab-planner-crew-demo` |
| 3                | Capability prefix        | `implement-widget` → **Coder**     |

**Footer legend** lists role+fleet pairs visible in the current filter (trace scope + search). Search matches resolved role labels (e.g. `planner` finds Idle Planner when **Show all registered** is on).

Role logic: `apps/console/src/utils/role-taxonomy.ts` (`resolveAgentRole`, `collectRoleLegendEntries`).  
Canonical role tokens mirror `@oacp/core` `MCPLAB_ROLES` — see [mcplab-integration.md](./mcplab-integration.md#role-taxonomy).

### Agent search (Day 19)

Client-side fuzzy search filters the visible agent catalog (respects Day 16 trace scope). Queries are **debounced** (`120ms`) so live polling stays smooth.

| Feature          | Behavior                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| **Fields**       | Name, URI, fleet, role (resolved), capabilities                           |
| **Fuzzy tokens** | Multi-word AND; substring match + subsequence fallback (`plnr` → Planner) |
| **Highlights**   | `<mark>` accents on matched substrings in name, URI, capabilities         |
| **Clear**        | × button on the search field                                              |
| **Shortcut**     | `/` focuses search when focus is not in an input                          |
| **No results**   | Actionable empty state with scope hint                                    |

Search logic: `apps/console/src/utils/agent-search.ts` (`searchAgents`).  
Performance target: 500 agents filtered in under **100ms** (Vitest benchmark).

### Catalog filters and sort (Day 20)

Toolbar chips and a sort dropdown refine the agent catalog **after** trace scope and **before** search. Pipeline: trace scope → catalog filters → fuzzy search → sort → fleet grouping.

| Control      | Behavior                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Status**   | Toggle `Active`, `Idle`, `Error` (OR within group). Active includes trace participants even when server status is idle          |
| **Fleet**    | Single-select fleet bucket (`MCPLab`, `Startup demo`, `System`, `External`); only fleets present in the current scope are shown |
| **In trace** | When a trace is selected, restrict to `activeAgentIds`                                                                          |
| **Sort**     | Name (default), last seen (`last_seen_at`), activity (timeline event count per agent)                                           |
| **Clear**    | Resets filters and sort to defaults                                                                                             |

Filter + search compose: e.g. fleet **MCPLab** + search `planner` → Idle Planner only (with **Show all registered** on).

Filter state persists in `sessionStorage` (`oacp.console.catalogFilters.v1`) for the browser session.

Filter logic: `apps/console/src/utils/agent-catalog-filter.ts` (`filterAgentsByCatalog`, `sortAgentsForCatalog`).  
UI: `AgentCatalogToolbar` + `useAgentCatalogFilters`.

### Agent detail drawer (Day 21)

Click an agent card to open a **slide-over drawer** on the right edge. Graph, message feed, and trace rail stay mounted and visible behind a light backdrop.

| Section           | Content                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Identity**      | URI (with **Copy URI**), version, description, fleet/role, status, last seen, public key fingerprint |
| **Capabilities**  | Full capability list (not truncated like cards)                                                      |
| **Recent traces** | Traces that include the agent (click to switch trace)                                                |
| **Messages**      | Last 10 inbound/outbound events in the **current** trace timeline                                    |

Dismiss with **Escape**, backdrop click, or the × close button. Closing the drawer does not clear graph selection (Day 22 will wire cross-panel filters).

**MCPLab config link** appears for `fleet=mcplab` agents. Resolution order:

1. `metadata.config_url` or `metadata.mcplab_config_url`
2. Convention: `{VITE_MCPLAB_LAB_URL}/agents/{short-agent-id}` (default lab base `http://127.0.0.1:8080`)

Detail logic: `apps/console/src/utils/agent-detail.ts`.  
UI: `AgentDetailDrawer` + `useDrawerDismiss`; state in `selection-store` (`detailAgentId`).

### Cross-panel linking (Day 22)

Selecting an agent links the catalog, delegation graph, and message feed without navigating away.

| Surface              | Behavior                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| **Graph (legacy)**   | Selected node accent ring; non-selected nodes dim; edges touching the agent highlight                    |
| **Graph (ops)**      | React Flow DAG — focus mode, replay scrubber, registry ghosts; selected node ring + dim neighbors        |
| **Graph (showcase)** | Three.js placeholder spheres; selected agent gets higher emissive intensity; `GraphModeToggle` in header |
| **Message feed**     | Timeline filtered to events where the agent is sender or recipient; filter bar + footer note             |
| **Header**           | **Clear selection** appears when an agent is selected — restores full feed and graph emphasis            |
| **URL**              | `?agent=agent://…` deep link (Day 13) syncs on select/clear via `replaceConsoleSelectionUrl`             |

Filter logic: `apps/console/src/utils/timeline-agent-filter.ts` (`filterTimelineForAgent`, `tailTimelineEventsForAgent`).

### Virtualized agent catalog (Day 23)

Large registries (500+ agents) render through **TanStack Virtual** — only visible fleet headers and agent cards mount in the DOM. Fleet grouping, filters, search, and sort still apply before virtualization.

| Density      | Card content                                      |
| ------------ | ------------------------------------------------- |
| **Compact**  | Role badge + short agent id (+ active/error chip) |
| **Detailed** | Name, fleet, full URI, capability pills (default) |

Density persists in `sessionStorage` (`oacp.console.agentDensity.v1`). Toggle: **Compact** | **Detailed** above the search field.

Virtual row logic: `apps/console/src/utils/virtual-agent-rows.ts` (`buildVirtualAgentRows`).  
UI: `VirtualizedAgentCatalog` + `AgentDensityToggle` + `useAgentCatalogDensity`.

### Pinned agents + row actions (Day 24)

Pin up to **5** agents to a dedicated **Pinned** section at the top of the catalog. Pins survive page reloads via `localStorage` (`oacp.console.pinnedAgents.v1`). Pinned agents are removed from fleet sections (no duplicates) but keep fleet-colored rings. **Pinned agents remain visible in trace-scoped view** (dimmed when not in the active trace).

Each agent card exposes a **⋯** menu (virtualized catalog only):

| Action             | Behavior                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| **Copy URI**       | Writes full `agent://…` id to the clipboard                                                       |
| **Filter feed**    | Selects the agent for cross-panel linking (message feed filter) without opening the detail drawer |
| **Focus in graph** | Same as filter feed — highlights the node and connected edges                                     |
| **Pin / Unpin**    | Toggles pin state; disabled when 5 pins are already set                                           |

Card click still toggles selection and opens the **Agent detail drawer** (Day 21). Row actions use `setSelectedAgent` (non-toggle) via `linkAgentSelection` in `useConsoleSnapshot`.

Pin logic: `apps/console/src/utils/pinned-agents.ts` (`splitPinnedAgents`, `MAX_PINNED_AGENTS`).  
Persistence: `apps/console/src/hooks/usePinnedAgents.ts`.  
UI: `AgentRowActions`, `PinnedSectionHeader`, `AgentCard` shell layout.

### Agent catalog test suite (Day 25)

Issue **#1** (agents indistinguishable) is **closed**. The catalog pipeline is covered by unit and Playwright suites plus a usability checklist in [console-spec.md](./console-spec.md#agent-catalog-usability-checklist-day-25).

| Layer               | Command                                                      |
| ------------------- | ------------------------------------------------------------ |
| Pipeline unit tests | `pnpm --filter @oacp/console test -- agent-catalog-pipeline` |
| Full catalog e2e    | `pnpm --filter @oacp/console test:e2e:catalog`               |
| Golden-path e2e     | `e2e/console-agent-catalog-suite.spec.ts`                    |

Pipeline: `apps/console/src/utils/agent-catalog-pipeline.ts` (`buildAgentCatalogView`) — trace scope (caller) → catalog filters → search → sort → pins → fleet groups. Used by `AgentsPanel`.

### Trace selection (Day 5)

| Feature             | Behavior                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| **Trace rail**      | Scrollable list — trace id (short), message/agent counts, relative last activity |
| **Click to select** | Refetches snapshot with `?trace_id=`; updates agent active highlights            |
| **Active row**      | Accent background + left border on the selected trace                            |
| **Deep link**       | `http://127.0.0.1:5173/?trace_id=<uuid>` opens that trace on load                |
| **URL sync**        | Selection updates the browser URL via `history.replaceState` (shareable links)   |
| **Back/forward**    | Browser navigation restores trace selection from the URL                         |

Example deep link (dev server):

```text
http://127.0.0.1:5173/?trace_id=0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b
```

When the trace list is truncated (`limit` query param, default 25), the rail footer shows `Showing N of M traces`.

### Message flow (Day 8)

| Feature             | Behavior                                                                                |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Timeline source** | `active_trace.timeline` from the selected trace snapshot                                |
| **Tail limit**      | Last **40** messages (legacy playground parity)                                         |
| **Row content**     | Summary line + route meta (`from → to · capability`)                                    |
| **Status accents**  | Green left border (`success`), red (`error`), pulse highlight for new rows in live mode |
| **Auto-scroll**     | Scrolls to bottom on each live poll when **Live** is enabled                            |
| **Empty states**    | “Select a trace…” / “Waiting for messages…” / “Loading message timeline…”               |

### Delegation graph (Day 10 / Day 27)

| State                | Behavior                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No trace**         | Grid empty state                                                                                                                                                       |
| **Loading**          | Animated SVG ring placeholder + status message                                                                                                                         |
| **Ready (`legacy`)** | Circular ring graph — trace-scoped agents on the ring, delegation edges with arrow markers                                                                             |
| **Ready (`ops`)**    | React Flow hierarchical DAG — circle nodes, bezier edges, data from Day 26 trace graph API                                                                             |
| **Showcase**         | Three.js force or sphere constellation — `?mode=showcase`; layout via `showcase_layout=`; labels, camera focus, edge pulses, bloom (Day 41), fleet clustering (Day 42) |

Graph mode is controlled at build time and overridable via URL `?mode=`:

```bash
# Default — legacy ring (Day 10)
pnpm --filter @oacp/console dev

# Ops 2D hierarchical graph (Day 27)
VITE_GRAPH_MODE=ops pnpm --filter @oacp/console dev

# Showcase 3D (Week 8 — force + sphere layouts)
VITE_GRAPH_MODE=showcase pnpm --filter @oacp/console dev
# Or switch at runtime: graph panel header **Ops 2D** | **Showcase 3D**
```

| Mode       | Implementation                                     | Data source                                                                     |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `legacy`   | `LegacyRingGraph` + `legacy-ring-layout.ts`        | Snapshot `agents` + `agent_links`                                               |
| `ops`      | `OpsGraph` + `ops-graph-layout.ts` (dagre)         | `GET /v1/observability/traces/:id/graph` via `useTraceGraph`                    |
| `showcase` | `ShowcaseGraph` + `@react-three/fiber` (Day 37–40) | Force/sphere layouts; hover/pinned labels; camera focus; poll-based edge pulses |

Ops mode uses trace-scoped nodes only (no full registry ring). Selection highlighting and edge dimming match Day 22 cross-panel linking.

**Label strategy (Day 28):** Nodes render as circles only — no permanent text. Hover a node for a tooltip (name, role, fleet, id) within ~120ms. Click a node to pin a single label (click again or press Escape to clear). Pinned labels use React Flow `NodeToolbar` and follow the node when the layout refreshes on poll.

**Edge styling (Day 29):** `OpsDelegationEdge` draws bezier curves with closed arrow markers. Stroke width scales with `message_count`; color encodes `kind` (`subtask`, `delegates`, `responds_to`). Edges render below nodes; hover shows capability + message count. Footer legend lists edge kinds present in the trace.

**Node styling (Day 30):** Active trace agents render **larger** (52px) with teal glow and pulse; idle agents are **smaller** (40px) and muted. Server `status` drives active vs idle when present. Selected agents use an accent ring (no pulse). `prefers-reduced-motion` disables pulse animation.

**Viewport navigation (Day 31):** Scroll wheel zooms, drag pans the canvas. **Fit view** and **Reset** sit in the **Delegation graph** panel header (not on the minimap). The **Overview** minimap is bottom-right on the canvas. **Double-click** a node to zoom in on that agent. Live poll refreshes preserve the current viewport so operators can inspect a region without losing context.

**Focus mode (Day 32):** Click a graph node (or select in the agent catalog) to **focus** it. The focused agent and its direct delegation neighbors stay at full opacity; all other nodes dim to **0.2**. In/out edges of the focused agent use the accent stroke; other edges dim. **Escape** or **Clear selection** clears focus. Graph footer shows `Focused: <agent>`.

**Trace replay (Day 33):** Multi-message traces show a **replay scrubber** below the ops graph. Drag the slider (message index 0…N) to step through the trace — the graph reveals only agents and delegation edges seen up to that message; the message feed shows the matching prefix and scrolls/highlights the active row. **Play** / **Pause** replays at **1×** or **2×** (timestamp-based steps). **Live** returns to the full trace. Replay pauses live feed auto-scroll until you go live again.

**Registry ghosts (Day 34):** **Show full registry** in the delegation graph panel (synced with the agent catalog toggle) adds registered-but-out-of-trace agents as **ghost nodes** — dashed, dimmed circles orbiting outside the trace hierarchy. Footer badge: **+N idle agents**. Hidden during trace replay scrub. Default remains trace-scoped.

**Week 7 sign-off (Day 35):** `OpsGraphLegend` documents idle, active, selected, and per-kind edges. Layout perf: **100 nodes &lt;500ms**. MCPLab 5-agent crew e2e fixture. Visual regression baseline: **30-agent** ops graph screenshot.

**Showcase 3D (Day 37–43):** Force/sphere layouts, hover labels, camera focus, poll-based edge pulses, **Day 41** post-processing bloom with starfield/hex backdrop, **Day 42** fleet orbital bands with legend filter, and **Day 43** full-screen presentation mode with auto-rotate camera and optional trace cycling.

```bash
pnpm --filter @oacp/console test -- showcase-presentation-mode showcase-orbital-bands-visibility usePresentationTraceCycle
pnpm --filter @oacp/console test:e2e --grep "Day 36|Day 37|Day 38|Day 39|Day 40|Day 41|Day 42|Day 43"
```

**Conference / kiosk demo URL:**

```text
http://127.0.0.1:5173/?trace_id=<id>&mode=showcase&showcase_layout=sphere&showcase_bloom=medium&presentation=1&presentation_cycle=1
```

Press **Esc** to exit presentation mode. For day-to-day debugging, use **Ops 2D** (`?mode=ops`) — presentation mode is opt-in for demos only.

```bash
pnpm --filter @oacp/console test -- ops-graph-layout ops-graph-label ops-graph-edge ops-graph-node-style ops-graph-viewport ops-graph-focus
pnpm --filter @oacp/console test:e2e --grep "Ops 2D"
```

### Cross-panel selection (Day 13)

| Feature             | Behavior                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Selection store** | Zustand (`apps/console/src/store/selection-store.ts`) — `selectedAgentId`, `selectedTraceId`, `graphMode` |
| **Agent click**     | Toggle selection; accent **ring** on card + thicker stroke on graph node                                  |
| **Trace click**     | Updates `selectedTraceId` (same as Day 5)                                                                 |
| **Poll survival**   | Selection lives in Zustand — unchanged when snapshot refetches                                            |
| **URL sync**        | `trace_id` + optional `agent` via `history.replaceState`                                                  |
| **Deep link**       | `?trace_id=<uuid>&agent=agent://mcplab-planner&mode=legacy`                                               |

Example agent deep link (dev server):

```text
http://127.0.0.1:5173/?trace_id=0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b&agent=agent://mcplab-planner-crew-demo&mode=legacy
```

`syncSelectionToSearch()` in `@oacp/observability-client` preserves unrelated params (`mode`, etc.).

### Errors and empty states (Day 14)

| Surface            | Offline / error                              | No trace selected                 | Trace selected, no messages        |
| ------------------ | -------------------------------------------- | --------------------------------- | ---------------------------------- |
| **Header**         | `Offline` badge                              | `Connected`                       | `Connected`                        |
| **Header (retry)** | `Reconnecting` while polling                 | —                                 | —                                  |
| **Global banner**  | Title + hint + **Retry** (401, 500, network) | —                                 | —                                  |
| **Graph**          | Snapshot unavailable hint                    | Select a trace or run MCPLab demo | Waiting for messages / graph loads |
| **Message flow**   | Snapshot unavailable                         | Select a trace…                   | **Waiting for messages…**          |
| **Trace rail**     | Cannot load traces…                          | No traces yet…                    | —                                  |

`formatObservabilityError()` in `@oacp/observability-client` maps `ObservabilityClientError` status codes to actionable copy.

`ConsoleErrorBoundary` catches render failures and offers Retry / Reload.

**Manual check — server stopped:**

```bash
# Stop Docker OACP or local server, keep Console dev running
pnpm --filter @oacp/console dev
# → Offline badge, global banner with Retry, panel empty states
```

## Packages

| Package                      | Description                                                                |
| ---------------------------- | -------------------------------------------------------------------------- |
| `@oacp/console`              | React + Vite SPA (`apps/console/`)                                         |
| `@oacp/ui`                   | Design tokens and theme CSS (`packages/ui/`)                               |
| `@oacp/observability-client` | Snapshot API client + React Query hooks (`packages/observability-client/`) |

## Design tokens

Import tokens in TypeScript:

```typescript
import { colors, tokens } from '@oacp/ui';
```

Import theme in CSS:

```css
@import '@oacp/ui/reset.css';
@import '@oacp/ui/theme.css';
```

Fleet identity colors (for MCPLab agent catalog):

| Fleet          | Token                   | Color            |
| -------------- | ----------------------- | ---------------- |
| `mcplab`       | `--oacp-fleet-mcplab`   | Cyan `#2dd4bf`   |
| `startup-demo` | `--oacp-fleet-startup`  | Amber `#f5a623`  |
| `system`       | `--oacp-fleet-system`   | Slate `#8b9cb3`  |
| `external`     | `--oacp-fleet-external` | Purple `#a78bfa` |

## URL parameters (target)

| Param                    | Example                      | Purpose                                                                        |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------ |
| `trace_id`               | `?trace_id=abeaa66c-…`       | Pre-select trace ✅ Day 5                                                      |
| `mode`                   | `?mode=showcase`             | Ops 2D vs Showcase 3D graph                                                    |
| `showcase_layout`        | `?showcase_layout=sphere`    | Showcase Force vs Sphere constellation (Day 38)                                |
| `showcase_bloom`         | `?showcase_bloom=high`       | Showcase bloom intensity: `off`, `low`, `medium`, `high` (Day 41)              |
| `showcase_fleet`         | `?showcase_fleet=mcplab`     | Showcase fleet filter: `mcplab`, `startup-demo`, `system`, `external` (Day 42) |
| `presentation`           | `?presentation=1`            | Full-screen presentation mode — hides side panels (Day 43)                     |
| `presentation_cycle`     | `?presentation_cycle=1`      | Auto-cycle traces during presentation (Day 43)                                 |
| `presentation_cycle_sec` | `?presentation_cycle_sec=60` | Trace cycle interval in seconds, minimum 5 (Day 43)                            |

**PNG export (Day 44):** Click **PNG** in the Delegation graph header (Ops or Showcase) to download a 1920×1080 graph image.

**Hero screenshot:** `CAPTURE_HERO=1 pnpm --filter @oacp/console capture:hero` → `apps/console/public/showcase-hero.png`
| `agent` | `?agent=agent://mcplab-planner` | Pre-select agent ✅ Day 13 |
| `presentation` | `?presentation=1` | Full-screen demo mode |

MCPLab deep link (Day 12): `/console/?trace_id=<id>&mode=showcase`

## Production (Day 7)

`@oacp/server` serves the built Console SPA at **`GET /console/`** when `apps/console/dist` exists.

```bash
pnpm build
pnpm --filter @oacp/server start
# → http://127.0.0.1:3847/console/
```

| Route             | Behavior                              |
| ----------------- | ------------------------------------- |
| `GET /console/`   | Console SPA (`index.html` + assets)   |
| `GET /console`    | `302` → `/console/` (query preserved) |
| `GET /playground` | `302` → `/console/` (query preserved) |
| `GET /` (browser) | `302` → `/console/`                   |

Legacy `/playground/snapshot` and `/v1/observability/snapshot` API routes remain on the same origin — the Console uses relative API paths, so no CORS configuration is required.

Environment variables:

| Variable              | Default                                            | Purpose                            |
| --------------------- | -------------------------------------------------- | ---------------------------------- |
| `OACP_CONSOLE_DIST`   | `apps/console/dist` (resolved from server package) | Override Console asset directory   |
| `OACP_CONSOLE_STATIC` | `1`                                                | Set `0` to disable static mounting |

Turbo ensures `@oacp/console` builds before `@oacp/server` (`turbo.json`).

## Build for production

```bash
pnpm --filter @oacp/ui build
pnpm --filter @oacp/console build
```

Output: `apps/console/dist/` — served by `@oacp/server` at `/console/` (Day 7). Production builds use `--base=/console/` so asset URLs resolve under the mount path.

Dev server (`pnpm dev`) serves from `/` on port **5173** with Vite proxy to the API.

## Scripts

| Command                                 | Description                      |
| --------------------------------------- | -------------------------------- |
| `pnpm --filter @oacp/console dev`       | Vite dev server on port **5173** |
| `pnpm --filter @oacp/console build`     | Production bundle                |
| `pnpm --filter @oacp/console typecheck` | TypeScript check                 |
| `pnpm --filter @oacp/ui build`          | Compile design token package     |

## Architecture

See [console-architecture.md](./console-architecture.md) for component tree, data flow, and package boundaries.

## Roadmap

Full delivery plan: [version1.md](./version1.md) (60 days to v1.0 + MCPLab joint launch).

## Related

- [playground.md](./playground.md) — legacy UI (deprecated → Console)
- [observability.md](./observability.md) — trace viewer and logging
- [delegation-graph.md](./delegation-graph.md) — graph edge kinds
- [architecture.md](./architecture.md) — monorepo layers
