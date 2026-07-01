# OACP Console — Observability API specification

Formal contract for the Console snapshot API introduced on **Day 6**. The OACP Console and `@oacp/observability-client` consume this endpoint for live agent catalog, trace selection, and (from Day 8+) graph and message feed rendering.

## Endpoints

| Method | Path                                      | Status                                               |
| ------ | ----------------------------------------- | ---------------------------------------------------- |
| `GET`  | `/v1/observability/snapshot`              | **Canonical** (Day 6+)                               |
| `GET`  | `/v1/observability/traces/:traceId/graph` | **Canonical** trace agent graph (Day 26+)            |
| `GET`  | `/v1/observability/events`                | **Canonical** SSE event stream (Day 46+)             |
| `GET`  | `/playground/snapshot`                    | Legacy alias — identical response; deprecated Day 60 |

Both paths share the same handler (`server/src/observability/snapshot-route.ts`). Prefer the v1 path for all new integrations.

### Discovery

`GET /` with `Accept: application/json` returns:

```json
{
  "api": {
    "observability_snapshot": "/v1/observability/snapshot",
    "playground_snapshot": "/playground/snapshot"
  }
}
```

## Query parameters

| Param      | Type            | Default | Description                                                             |
| ---------- | --------------- | ------- | ----------------------------------------------------------------------- |
| `trace_id` | `string` (UUID) | —       | Hydrate `active_trace`, `agent_links`, and message stats for this trace |
| `limit`    | `integer`       | `25`    | Maximum traces returned in `traces` listing (server caps apply)         |

### Examples

```http
GET /v1/observability/snapshot
GET /v1/observability/snapshot?trace_id=0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b
GET /v1/observability/snapshot?trace_id=0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b&limit=10
GET /v1/observability/traces/0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b/graph
```

## Response envelope

### Success (`200 OK`)

```json
{
  "ok": true,
  "snapshot": {}
}
```

| Field      | Type                    | Required | Description           |
| ---------- | ----------------------- | -------- | --------------------- |
| `ok`       | `true`                  | yes      | Success discriminator |
| `snapshot` | `ObservabilitySnapshot` | yes      | Unified poll payload  |

### Error

Errors use the standard OACP server envelope (`ok: false`, `error.code`, `error.message`). Network failures are surfaced by `@oacp/observability-client` as `ObservabilityClientError`.

## `ObservabilitySnapshot` schema

Backward-compatible with the legacy playground snapshot shape.

| Field          | Type                         | Required | Description                                                                 |
| -------------- | ---------------------------- | -------- | --------------------------------------------------------------------------- |
| `server`       | `ServerHealth`               | yes      | Process health and registry summary                                         |
| `agents`       | `AgentObservabilityRecord[]` | yes      | Full agent registry with Day 9+ runtime enrichment                          |
| `traces`       | `TraceListEntry[]`           | yes      | Recent trace summaries (newest first)                                       |
| `trace_count`  | `number`                     | yes      | Total traces in store (may exceed `traces.length`)                          |
| `active_trace` | `TraceBundle`                | no       | Present when `trace_id` query param is set and trace resolves               |
| `agent_links`  | `AgentLink[]`                | yes      | Aggregated delegation edges from `active_trace.graph` (empty when no trace) |

## Trace agent graph (Day 26)

Dedicated endpoint for **Ops 2D** graph rendering. Returns **trace participants only** — not the full agent registry.

```
GET /v1/observability/traces/:traceId/graph
```

### Success (`200 OK`)

```json
{
  "ok": true,
  "graph": {
    "trace_id": "0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b",
    "layout": "hierarchical",
    "max_depth": 2,
    "nodes": [
      {
        "agent_id": "agent://coordinator",
        "name": "Coordinator",
        "depth": 0,
        "fleet": "mcplab",
        "role": "coordinator",
        "status": "active",
        "capabilities": ["orchestrate"]
      }
    ],
    "edges": [
      {
        "from_agent": "agent://coordinator",
        "to_agent": "agent://worker",
        "kind": "subtask",
        "capability": "echo",
        "message_count": 1
      }
    ]
  }
}
```

| Field                               | Type               | Description                                                       |
| ----------------------------------- | ------------------ | ----------------------------------------------------------------- |
| `layout`                            | `"hierarchical"`   | Default layout hint for delegation DAG (Day 27 React Flow)        |
| `max_depth`                         | `number`           | Maximum `depth` among nodes                                       |
| `nodes[].depth`                     | `number`           | BFS depth from delegation roots (`delegates` / `subtask` edges)   |
| `nodes[].fleet` / `role` / `status` | —                  | Same enrichment as snapshot agents                                |
| `edges`                             | `TraceGraphEdge[]` | Agent-to-agent links aggregated from delegation graph or timeline |

### Error (`404`)

Returned when the trace is unknown or has no participating agents.

### Distinction from message graph

| Endpoint                                      | Granularity                     | Use                       |
| --------------------------------------------- | ------------------------------- | ------------------------- |
| `GET /graph/traces/:traceId`                  | Message-level `DelegationGraph` | Audit, workflow debugging |
| `GET /v1/observability/traces/:traceId/graph` | Agent-level `TraceGraphView`    | Console Ops 2D topology   |

Client: `fetchTraceGraph()` and `useTraceGraph()` from `@oacp/observability-client`. Console Ops mode (`GraphPanel` + `OpsGraph`) consumes this endpoint.

### Ops graph labels (Day 28)

| Interaction           | Behavior                                                                           |
| --------------------- | ---------------------------------------------------------------------------------- |
| Default               | Circle nodes only — no permanent text on canvas                                    |
| Hover                 | `OpsGraphLabel` tooltip: name, role, fleet, short id (~120ms fade-in)              |
| Click node            | Pin one label at a time (`NodeToolbar` below node); click again or `Escape` clears |
| Poll / layout refresh | Pinned label re-attaches to the same `agent_id`                                    |

Test ids: `ops-graph-tooltip-<shortId>`, `ops-graph-pinned-label-<shortId>`.

### Ops graph edges (Day 29)

| Interaction | Behavior                                                    |
| ----------- | ----------------------------------------------------------- |
| Path        | Bezier curve (`OpsDelegationEdge`) with arrow marker        |
| Width       | Scales with `message_count` relative to trace max           |
| Color       | `subtask` blue, `delegates` light blue, `responds_to` green |
| Z-order     | Edges below nodes (`z-index` 0 vs 1)                        |
| Hover       | Tooltip: kind, capability, message count                    |
| Legend      | `GraphPanel` footer lists kinds present in trace            |

Test ids: `ops-graph-edge-<from>-<to>-<index>`, `…-tooltip`.

### Ops graph nodes (Day 30)

| State              | Visual                                         |
| ------------------ | ---------------------------------------------- |
| **Active**         | 52px circle, teal glow, pulse animation        |
| **Idle**           | 40px circle, muted opacity                     |
| **Selected**       | Accent ring + glow; pulse disabled             |
| **Reduced motion** | Pulse animation off (`prefers-reduced-motion`) |

Detection: server `status` first (`active` / `error` → active; `idle` / `offline` → idle), then trace roster fallback. Attribute: `data-node-visual`.

### Ops graph viewport (Day 31)

| Interaction                 | Behavior                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------- |
| Scroll wheel                | Zoom in/out (`zoomOnScroll`; 0.15–2.5× range)                                           |
| Drag canvas                 | Pan (`panOnDrag`)                                                                       |
| **Fit view** (panel header) | `fitView` with 18% padding; updates baseline viewport                                   |
| **Reset** (panel header)    | Restores baseline viewport snapshot from initial fit                                    |
| **Double-click node**       | `setCenter` at 1.35× zoom on node center                                                |
| **Single-click node**       | Pin label (250ms delay to avoid double-click conflict)                                  |
| **Minimap**                 | Bottom-right `Overview` panel; circle glyphs; pannable + zoomable; active/selected tint |
| Poll refresh                | Viewport preserved on same trace; auto-fit only on trace change                         |

Implementation notes: MiniMap requires `onNodesChange`, explicit node dimensions (`measured`), and SVG-safe hex `nodeColor` values. Do not wrap MiniMap in an extra React Flow `Panel` (it positions itself).

Test ids: `ops-graph-viewport-controls`, `ops-graph-fit-view`, `ops-graph-reset-view`, `ops-graph-minimap` (canvas overview, bottom-right).

### Ops graph focus (Day 32)

| Interaction                  | Behavior                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Graph node click             | Sets focus via shared `selectedAgentId` (`selectAgent` toggle)                        |
| Catalog selection            | Same focus scope — neighborhood highlighting in graph + feed filter                   |
| Focused node                 | Accent ring; `data-focus-role="focused"`                                              |
| Neighbors                    | Full opacity; `data-focus-role="neighbor"` (1-hop via any edge)                       |
| Non-neighbors                | Opacity **0.2** on React Flow node wrapper (`node.style`); `data-focus-role="dimmed"` |
| In/out edges                 | Accent stroke, full opacity                                                           |
| Other edges                  | Dimmed (opacity 0.2 when focus active)                                                |
| **Escape**                   | Clears focus + pinned label                                                           |
| **Clear selection** (header) | Clears focus across panels                                                            |

Attributes: `data-focus-active` on `#ops-graph`, `data-focus-role` on nodes. Logic: `ops-graph-focus.ts`.

### Ops graph trace replay (Day 33)

| Interaction         | Behavior                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Scrubber visibility | Shown in ops mode when trace has **≥ 2** messages                                                             |
| Slider              | Message index 0…N (inclusive); default **Live** at latest message                                             |
| Graph               | `sliceTraceGraphForReplay` — nodes/edges from timeline prefix only                                            |
| Feed                | Same prefix timeline; active row highlighted; scroll-into-view on scrub                                       |
| **Play**            | Replays from message 0 (or current index) using timestamp deltas                                              |
| **Pause**           | Freezes graph + feed at current index                                                                         |
| Speed toggle        | **1×** / **2×**                                                                                               |
| **Live**            | Restores full graph, feed tail, smart auto-scroll when pinned to bottom (Day 48), and live incremental append |
| Trace change        | Resets replay to live                                                                                         |

Attributes: `data-replay-active` on `#ops-graph`, `data-scrub-active` on feed rows, `data-replay-live` on scrubber root. Logic: `trace-replay.ts`, `useTraceReplay`.

Test ids: `trace-replay-scrubber`, `trace-replay-slider`, `trace-replay-play`, `trace-replay-pause`, `trace-replay-speed`, `trace-replay-go-live`, `trace-replay-label`.

### Ops graph registry ghosts (Day 34)

| Interaction                           | Behavior                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------- |
| **Show full registry** (graph footer) | Same Zustand flag as agent catalog — `showAllRegisteredAgents`            |
| Ghost nodes                           | Registry agents not in trace graph API; dashed idle styling               |
| Layout                                | Dagre hierarchy for trace participants; ghosts on outer orbit + repulsion |
| Badge                                 | `+N idle agents` when expanded (`ops-graph-ghost-badge`)                  |
| Replay                                | Ghosts suppressed while trace replay scrub is active (not live)           |
| Default                               | Trace-scoped graph only                                                   |

Attributes: `data-registry-expanded` on `#ops-graph`, `data-ghost` / `data-node-visual="ghost"` on ghost nodes.

Test ids: `ops-graph-show-all-toggle`, `ops-graph-registry-bar`, `ops-graph-ghost-badge`, `ops-graph-ghost-legend`.

### Ops graph sign-off (Day 35)

| Check               | Target                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| Legend              | `OpsGraphLegend` — idle, active, selected, edge kind swatches                 |
| Depth               | `computeOpsGraphAgentDepths` in `ops-graph-depth.ts`                          |
| Layout perf         | 100-node dagre layout **&lt;500ms** (unit test)                               |
| MCPLab e2e          | 5-agent crew renders in ops mode; wheel zoom after fit                        |
| Visual regression   | Playwright snapshot `ops-graph-30-agent.png` (30-agent fixture)               |
| Issue #2 (Ops)      | Bezier edges, z-order, layout separation — closed for Ops mode                |
| Issue #2 (Showcase) | 3D force layout, edge animation, presentation, PNG export — **closed Day 45** |

Legend test ids: `ops-graph-legend`, `ops-graph-legend-idle`, `ops-graph-legend-active`, `ops-graph-legend-selected`, `ops-graph-legend-edge-<kind>`.

### Showcase 3D graph (Day 36–37)

| Interaction            | Behavior                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| **Showcase 3D** button | Sets `graphMode=showcase`; updates URL `?mode=showcase`                 |
| **Ops 2D** button      | Sets `graphMode=ops`; updates URL `?mode=ops`                           |
| Canvas                 | `@react-three/fiber` WebGL; `data-testid="showcase-graph"`              |
| Data                   | `GET /v1/observability/traces/:id/graph` — same trace graph as Ops mode |
| Layout                 | `d3-force-3d` simulation in `showcase-graph-force.ts` (Day 37)          |
| Nodes                  | Sphere radius ∝ message volume + active boost; color by fleet           |
| Edges                  | `@react-three/drei` `Line` segments; color by delegation kind           |
| Fallback               | Orbital placeholder ring when trace graph unavailable (Day 36)          |
| Controls               | `@react-three/drei` `OrbitControls` — rotate, zoom, pan                 |
| Loading                | Showcase waits for trace graph (`aria-busy` on `#graphPanel`)           |

Test ids: `showcase-graph`, `graph-mode-toggle`, `graph-mode-ops`, `graph-mode-showcase`.

Data attributes: `data-showcase-layout` (`force` \| `sphere` \| `placeholder`), `data-showcase-edge-shape` (`line` \| `arc`), `data-showcase-node-count`, `data-showcase-edge-count`, `data-showcase-focused-agent`, `data-showcase-visible-label-count` (Day 39).

### Showcase sphere constellation (Day 38)

| Interaction       | Behavior                                                                          |
| ----------------- | --------------------------------------------------------------------------------- |
| **Force** button  | Star/force layout (Day 37); straight delegation edges                             |
| **Sphere** button | Fibonacci constellation on inner/outer shells; arc edges                          |
| Fleet bands       | Inner shell radius `4.0` — MCPLab + System; outer `5.8` — Startup demo + External |
| Arc edges         | Great-circle paths raised above the shell (`showcase-graph-arc-edges.ts`)         |
| Shells            | Wireframe inner/outer spheres visible in sphere mode                              |
| URL               | `?mode=showcase&showcase_layout=sphere`                                           |

Test ids: `showcase-layout-toggle`, `showcase-layout-force`, `showcase-layout-sphere`.

### Showcase hover labels + selection (Day 39)

| Interaction   | Behavior                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------- |
| Default view  | No floating labels — `data-showcase-visible-label-count="0"`                             |
| Hover node    | Single hover tooltip via `@react-three/drei/Html` (`ShowcaseNodeLabel`, variant `hover`) |
| Click node    | Pins label, selects agent in shared store, animates camera to node                       |
| Catalog click | Same selection + pinned label + camera focus in showcase canvas                          |
| Escape        | Clears selection, pinned label, and focus state                                          |

Helpers: `showcase-graph-label.ts` (visibility rules), `showcase-graph-camera-focus.ts` (focus viewport + lerp).

Test ids: `showcase-graph-label-pinned-<id>`, `showcase-graph-label-hover-<id>` (suffix from `opsGraphAgentTestId`).

Data attributes: `data-showcase-focused-agent`, `data-showcase-visible-label-count`.

### Showcase edge animation (Day 40)

| Interaction    | Behavior                                                                  |
| -------------- | ------------------------------------------------------------------------- |
| Live poll      | New timeline messages with `from`/`to` enqueue traveling particle pulses  |
| SSE hook       | `enqueueShowcaseEdgePulse()` — Day 46 SSE transport calls the same bus    |
| Active edges   | Brighter opacity when edge has traffic and touches active trace agents    |
| Idle edges     | Dimmed opacity when endpoints are out of trace or have no traffic         |
| Pulse particle | Small sphere travels along line/arc path (~1.1s)                          |
| Reduced motion | `data-showcase-edge-animation=static` — no particles, static edge opacity |
| Perf           | Max 12 concurrent pulses; `useFrame` particle updates only                |

Helpers: `showcase-graph-edge-style.ts`, `showcase-graph-edge-pulse.ts`, `showcase-edge-pulse-bus.ts`, `useShowcaseEdgePulses`.

Data attributes: `data-showcase-edge-animation`, `data-showcase-edge-active-count`, `data-showcase-edge-idle-count`, `data-showcase-pulse-count`, `data-showcase-pulse-total`, `data-showcase-timeline-count`.

Dev hook: `window.__OACP_ENQUEUE_SHOWCASE_EDGE_PULSE__` (development builds only).

### Showcase post-processing bloom (Day 41)

| Interaction | Behavior                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------- |
| Bloom pass  | `@react-three/postprocessing` `Bloom` — selective via luminance threshold `1`             |
| Active glow | Active/selected/hover node colors lifted above threshold (`showcase-graph-node-bloom.ts`) |
| Edge pulses | Pulsing edges and particles bloom during Day 40 animation                                 |
| Backdrop    | `ShowcaseBackdrop` — starfield + hex grid floor                                           |
| Settings    | `ShowcasePresentationSettings` — Off / Low / Med / High                                   |
| Enter       | **Present** button in graph header (Showcase mode) — same as `?presentation=1`            |
| Cycle       | **Cycle** toggle beside Present — enables `presentation_cycle=1`                          |
| GPU profile | Integrated GPUs cap bloom level + lower bloom resolution                                  |
| URL         | `?mode=showcase&showcase_bloom=medium`                                                    |

Test ids: `showcase-presentation-settings`, `showcase-bloom-off`, `showcase-bloom-low`, `showcase-bloom-medium`, `showcase-bloom-high`.

Data attributes: `data-showcase-bloom`, `data-showcase-bloom-effective`, `data-showcase-gpu-profile`, `data-showcase-backdrop`.

### Showcase fleet clustering (Day 42)

| Interaction    | Behavior                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| Orbital bands  | `ShowcaseFleetOrbitalBands` — wireframe rings per fleet (MCPLab cyan, startup-demo amber) |
| Cluster layout | Force/star layouts offset nodes by fleet bucket (`showcase-graph-fleet-cluster.ts`)       |
| Fleet legend   | `ShowcaseFleetLegend` overlay — All + fleet filter chips                                  |
| Fleet filter   | Selecting a fleet dims other fleets' nodes and edges in 3D                                |
| URL            | `?mode=showcase&showcase_fleet=mcplab`                                                    |

Test ids: `showcase-fleet-legend`, `showcase-fleet-filter-all`, `showcase-fleet-filter-mcplab`, `showcase-fleet-filter-startup-demo`.

Data attributes: `data-showcase-fleet-count`, `data-showcase-fleet-filter`.

### Showcase presentation mode (Day 43)

| Interaction   | Behavior                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Enter         | **Present** button in Showcase graph header, or `?presentation=1` — hides header, agent catalog, message flow, trace rail; graph fills viewport |
| Cycle toggle  | **Cycle** button beside Present — sets `presentation_cycle=1` before entering                                                                   |
| Auto-rotate   | Showcase camera auto-rotates when idle; pauses on drag/zoom; resumes after 12s                                                                  |
| Trace cycle   | Optional `presentation_cycle=1` advances traces every `presentation_cycle_sec` (default 60)                                                     |
| Exit          | `Esc` removes presentation mode and restores standard console layout                                                                            |
| Defaults      | Presentation URL auto-selects Showcase mode when graph mode is legacy                                                                           |
| Orbital bands | Hidden for single-fleet operator views; visible in presentation or multi-fleet traces                                                           |

Test ids: `console-presentation-mode`, `showcase-presentation-exit-hint`, `showcase-presentation-controls`, `showcase-presentation-enter`, `showcase-presentation-cycle`.

Data attributes: `data-showcase-presentation`, `data-showcase-auto-rotate`, `data-showcase-orbital-bands`, `data-presentation-cycle`.

**Conference demo URL:**

```text
/?trace_id=<id>&mode=showcase&showcase_layout=sphere&showcase_bloom=medium&presentation=1&presentation_cycle=1
```

### Showcase + Ops sync (Day 44)

| Interaction        | Behavior                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Shared selection   | Trace + agent selection stored in Zustand; preserved when toggling Ops ↔ Showcase               |
| Ops pin sync       | Ops pinned label follows `selectedAgentId` from catalog / Showcase                              |
| Mode switch camera | Entering Ops with a selected agent runs `zoomToNode`; Showcase frames via `ShowcaseCameraFocus` |
| PNG export         | **PNG** button in graph header — downloads 1920×1080 PNG for Ops or Showcase                    |
| Hero capture       | `CAPTURE_HERO=1 pnpm --filter @oacp/console capture:hero` writes `public/showcase-hero.png`     |

Test ids: `graph-export-png`, `data-graph-export-mode`.

Dev hook: `window.__OACP_EXPORT_SHOWCASE_PNG__` (development builds only).

### Showcase performance + sign-off (Day 45)

| Check           | Target                                                                               |
| --------------- | ------------------------------------------------------------------------------------ |
| Performance doc | [console-performance-budget.md](./console-performance-budget.md)                     |
| Constants       | `showcase-performance-budget.ts` — layout ms + 30/100 node FPS floors                |
| Vitest          | 30-node force &lt;3s, 100-node force &lt;8s, Ops 100-node &lt;500ms                  |
| Manual QA       | [console-showcase-qa-checklist.md](./console-showcase-qa-checklist.md)               |
| E2E sign-off    | `console-showcase-signoff.spec.ts` — `pnpm --filter @oacp/console test:e2e:showcase` |
| Issue #2        | **Closed** — Ops operator layer + Showcase launch demo layer                         |

### Showcase 3D force layout (Day 37)

| Check        | Target                                                                   |
| ------------ | ------------------------------------------------------------------------ |
| Force engine | `d3-force-3d` — link, charge, center, collide                            |
| Node sizing  | `showcase-graph-node-style.ts` — activity from edge `message_count`      |
| Fleet colors | `showcase-fleet-colors.ts`                                               |
| Perf         | 30-node simulation **&lt;3s** (unit test)                                |
| Overlap      | 28-node pairwise separation guard (≤5% soft violations)                  |
| E2E          | 27-agent force layout + loading gate in `console-showcase-graph.spec.ts` |

---

### `ServerHealth`

| Field               | Type        | Description                          |
| ------------------- | ----------- | ------------------------------------ |
| `status`            | `"healthy"` | Server liveness                      |
| `protocol_version`  | `string`    | OACP protocol version (e.g. `"1.0"`) |
| `registered_agents` | `number`    | Count of agents in registry          |
| `bus_open`          | `boolean`   | Message bus accepting traffic        |

### `AgentIdentity`

Mirrors agent registration schema.

| Field          | Type            | Required                                          |
| -------------- | --------------- | ------------------------------------------------- |
| `id`           | `string`        | yes — `agent://…` URI                             |
| `name`         | `string`        | yes                                               |
| `version`      | `string`        | yes                                               |
| `capabilities` | `string[]`      | yes                                               |
| `publicKey`    | `string \| JWK` | yes                                               |
| `description`  | `string`        | no                                                |
| `metadata`     | `object`        | no — see [agent-identity.md](./agent-identity.md) |

### `AgentObservabilityRecord` (Day 9+)

Each `agents[]` row extends `AgentIdentity` with server-derived runtime fields. Clients must tolerate unknown fields.

| Field          | Type                                         | Required | Description                                                                                                                        |
| -------------- | -------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `fleet`        | `string`                                     | no       | From `metadata.fleet`, or inferred `mcplab` for `agent://mcplab-*` URIs (Day 11)                                                   |
| `role`         | `string`                                     | no       | From `metadata.role`, or inferred from MCPLab URI/name (Day 11)                                                                    |
| `status`       | `"idle" \| "active" \| "error" \| "offline"` | yes      | `active` when agent participates in `active_trace`; `error` when agent sent a `task_response` with `status: "error"` in that trace |
| `last_seen_at` | `string` (ISO-8601)                          | no       | Latest trace activity timestamp for this agent                                                                                     |

Enrichment logic: `server/src/observability/agent-enrichment.ts` + `@oacp/core` `resolveAgentObservabilityTaxonomy()`.

See [mcplab-integration.md](./mcplab-integration.md) for MCPLab registration contract and role taxonomy.

### `TraceListEntry`

| Field            | Type       | Description                          |
| ---------------- | ---------- | ------------------------------------ |
| `traceId`        | `string`   | Trace UUID                           |
| `startedAt`      | `string`   | ISO-8601 first message timestamp     |
| `lastActivityAt` | `string`   | ISO-8601 last message timestamp      |
| `messageCount`   | `number`   | Messages in trace                    |
| `messageTypes`   | `string[]` | Distinct OACP message types observed |
| `agents`         | `string[]` | Participating agent URIs             |

### `TraceBundle`

Hydrated when `trace_id` is provided. Powers agent active highlighting, graph, and message feed (Day 8+).

| Field              | Type                   | Description                     |
| ------------------ | ---------------------- | ------------------------------- |
| `trace_id`         | `string`               | Trace UUID                      |
| `started_at`       | `string`               | ISO-8601                        |
| `last_activity_at` | `string`               | ISO-8601                        |
| `message_count`    | `number`               | Total messages                  |
| `message_types`    | `string[]`             | Distinct types                  |
| `agents`           | `string[]`             | Participating agent URIs        |
| `timeline`         | `TraceTimelineEvent[]` | Ordered events for message feed |
| `graph`            | `DelegationGraph`      | Optional materialized graph     |
| `memory_entries`   | `MemoryEntry[]`        | Optional persisted memory rows  |

### `TraceTimelineEvent`

| Field        | Type     | Description                  |
| ------------ | -------- | ---------------------------- |
| `index`      | `number` | Zero-based position in trace |
| `timestamp`  | `string` | ISO-8601                     |
| `type`       | `string` | OACP message type            |
| `from`       | `string` | Sender agent URI             |
| `to`         | `string` | Recipient (optional)         |
| `capability` | `string` | Routed capability (optional) |
| `status`     | `string` | Response status (optional)   |
| `message_id` | `string` | Message UUID                 |
| `summary`    | `string` | Human-readable one-liner     |

### `AgentLink`

Aggregated edge for graph rendering. Derived from `active_trace.graph.edges`.

| Field           | Type     | Description                           |
| --------------- | -------- | ------------------------------------- |
| `from_agent`    | `string` | Source agent URI                      |
| `to_agent`      | `string` | Target agent URI                      |
| `kind`          | `string` | Edge kind (`subtask`, `delegates`, …) |
| `capability`    | `string` | Optional capability                   |
| `message_count` | `number` | Aggregated messages on this edge      |

## Client usage

```typescript
import { fetchSnapshot, OBSERVABILITY_SNAPSHOT_PATH } from '@oacp/observability-client';

const snapshot = await fetchSnapshot({
  baseUrl: 'http://127.0.0.1:3000',
  traceId: '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b',
  snapshotPath: OBSERVABILITY_SNAPSHOT_PATH,
});
```

React Console app:

```tsx
<ObservabilityProvider config={{ snapshotPath: '/v1/observability/snapshot' }}>
  <ConsoleLayout />
</ObservabilityProvider>
```

## Polling semantics

| Concern            | Behavior                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **Trace list**     | Returned on every poll regardless of `trace_id`                                                           |
| **Active trace**   | Only when `trace_id` query param is set                                                                   |
| **Stale trace_id** | Server omits `active_trace`; client falls back to latest listed trace (Day 5)                             |
| **Live mode**      | Console polls at 1–3s; TanStack Query key includes `traceId`                                              |
| **Message feed**   | Last 40 timeline events; append-only merge by `message_id` (Day 47); SSE `message.appended` between polls |
| **MCPLab Docker**  | Client auto-falls back to `/playground/snapshot` when v1 returns 404                                      |

## Versioning

| Version     | Path                         | Notes                                       |
| ----------- | ---------------------------- | ------------------------------------------- |
| v0 (legacy) | `/playground/snapshot`       | Playground HTML era; frozen shape           |
| **v1**      | `/v1/observability/snapshot` | Console default from Day 6; shape unchanged |
| v1.0 freeze | Day 54                       | Breaking changes require version bump       |

SSE events (`GET /v1/observability/events`) — see [observability-events.md](./observability-events.md) (Day 46).

## Contract tests

```bash
pnpm --filter @oacp/server test -- observability-api.test.ts
pnpm --filter @oacp/server test -- trace-graph
pnpm --filter @oacp/observability-client test
pnpm --filter @oacp/console test -- agent-catalog-pipeline
pnpm --filter @oacp/console test:e2e:catalog
```

Tests assert:

- v1 and legacy endpoints return identical snapshots
- Required fields present on empty and hydrated responses
- `trace_id` and `limit` query params honored
- Server index advertises v1 path
- Day 9: enriched agents include `fleet`, `role`, `status`, and `last_seen_at` when applicable
- Day 25: agent catalog pipeline composes trace scope, filters, search, sort, pins, and fleet grouping
- Day 26: trace agent graph endpoint returns trace-scoped nodes with `depth`, `fleet`, `role`, `status`

```bash
pnpm --filter @oacp/server test -- agent-enrichment.test.ts
```

## Agent catalog usability checklist (Day 25)

Manual and automated checks for **Issue #1** closure (Weeks 4–5). Run `pnpm --filter @oacp/console test:e2e:catalog` for the Playwright suite.

### Trace scope (Day 16)

| Check                       | Expected                                          |
| --------------------------- | ------------------------------------------------- |
| Default with trace selected | Only agents participating in the active trace     |
| Scope badge                 | `N of M agents` when trace-scoped                 |
| **Show all registered**     | Full registry visible; out-of-trace agents dimmed |
| Trace switch                | Resets to trace-scoped list                       |

### Fleet + role identity (Days 17–18)

| Check                      | Expected                                                    |
| -------------------------- | ----------------------------------------------------------- |
| Fleet sections             | MCPLab → Startup demo → System → External (empty omitted)   |
| Fleet ring                 | Left border color matches fleet token                       |
| Role badge                 | Glyph + label on every card; legend in panel footer         |
| Same role, different fleet | Distinguishable by fleet ring + URI without reading full id |

### Search + filters (Days 19–20)

| Check        | Expected                                               |
| ------------ | ------------------------------------------------------ |
| `/` shortcut | Focuses search field                                   |
| Fuzzy search | Matches name, URI, fleet, role, capabilities           |
| Highlight    | Matching substrings accented in card                   |
| Filter chips | Status, fleet, in-trace compose with search            |
| Sort         | Name, last seen, activity (timeline message count)     |
| Persistence  | Filters + density + fleet collapse in `sessionStorage` |

### Detail + linking (Days 21–22)

| Check                        | Expected                                              |
| ---------------------------- | ----------------------------------------------------- |
| Card click                   | Opens detail drawer; graph + feed remain visible      |
| Escape / backdrop            | Closes drawer                                         |
| Agent selection              | Graph node highlight; feed filtered to agent messages |
| **Clear selection** (header) | Restores full feed and graph emphasis                 |
| Deep link                    | `?agent=agent://…` syncs selection                    |

### Virtualization + pins (Days 23–24)

| Check          | Expected                                                  |
| -------------- | --------------------------------------------------------- |
| Large registry | 100+ agents virtualized; smooth scroll                    |
| Density toggle | Compact vs detailed; persists in session                  |
| Pin (max 5)    | Pinned section at top; survives reload (`localStorage`)   |
| Row actions    | Copy URI, filter feed, focus graph without opening drawer |

### MCPLab demo readiness

| Check          | Expected                                       |
| -------------- | ---------------------------------------------- |
| Registry scale | 27+ agents without layout break                |
| MCPLab crew    | All agents under MCPLab fleet with role badges |
| Planner pin    | Stays at top across live poll refresh          |

## Message feed usability checklist (Day 50 — Issue #3)

Manual and automated checks for **Issue #3** closure (Weeks 10). Run `pnpm --filter @oacp/console test:e2e:feed` for the Playwright suite. Full manual script: [console-message-feed-qa-checklist.md](./console-message-feed-qa-checklist.md).

### Incremental feed (Days 46–47)

| Check              | Expected                                                 |
| ------------------ | -------------------------------------------------------- |
| SSE connected      | `message.appended` appends rows by `message_id`          |
| Poll reconcile     | Existing row DOM nodes preserved on snapshot refresh     |
| New row animation  | Slide-in once per `message_id`; reduced motion respected |
| Reconcile interval | Default 30s; SSE debounced resync between polls          |

### Smart scroll + pause (Days 48–49)

| Check            | Expected                               |
| ---------------- | -------------------------------------- |
| Pinned to bottom | Auto-scroll on new messages            |
| Scrolled up      | No jump; **↓ N new messages** chip     |
| Feed pause       | Buffers poll + SSE; flush on resume    |
| Hover pause      | Same buffer path; flush on mouse leave |
| Virtual list     | 1000+ message trace scrolls smoothly   |
| Expand row       | JSON detail, latency, correlation ids  |
| Filter bar       | Type, agent, capability, status, text  |

### Polish + export (Day 50)

| Check        | Expected                                            |
| ------------ | --------------------------------------------------- |
| Tone accents | Request blue, delegation purple, response green/red |
| JSONL export | One JSON object per line; sanitized filename        |
| CSV export   | Header + escaped cells                              |
| Trace rail   | Status badge + duration per trace                   |
| Live demo    | 5-minute MCPLab run without feed disruption         |

## Related

- [console.md](./console.md) — Console development guide
- [observability-client.md](./observability-client.md) — TypeScript client and hooks
- [observability.md](./observability.md) — Trace APIs and logging
- [http-server.md](./http-server.md) — Full server API reference
- [version1.md](./version1.md) — 60-day delivery plan
