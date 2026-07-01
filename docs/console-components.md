# OACP Console — UI components (`@oacp/ui`)

Shared React primitives for the OACP Console. All styles use **CSS custom properties** from `theme.css` — no hard-coded colors in components.

## Import

```tsx
import { Panel, Badge, Stat, Button, Toggle, SearchInput } from '@oacp/ui';
import '@oacp/ui/reset.css';
import '@oacp/ui/theme.css';
```

`theme.css` automatically imports `components.css`.

## Components

### Panel

Glass HUD container with titled header, scrollable body, optional footer.

```tsx
<Panel title="Registered agents" footer={<span>Legend</span>}>
  <p>Content</p>
</Panel>
```

| Prop            | Type        | Description                                                           |
| --------------- | ----------- | --------------------------------------------------------------------- |
| `title`         | `string`    | Uppercase header label                                                |
| `headerActions` | `ReactNode` | Optional toolbar aligned to the header right (e.g. graph Fit / Reset) |
| `children`      | `ReactNode` | Body content                                                          |
| `footer`        | `ReactNode` | Optional footer (legends, actions)                                    |
| `bodyClassName` | `string`    | Extra classes on body (e.g. zero padding)                             |
| `id`            | `string`    | DOM id for anchors and tests                                          |

### Badge

Status pill for connection state.

| Variant                         | Use                 |
| ------------------------------- | ------------------- |
| `live`                          | Active live refresh |
| `paused`                        | Polling paused      |
| `success` / `warning` / `error` | Semantic states     |
| `default`                       | Neutral             |

### Stat

Metric tile — label + tabular value. Used in agent panel stats row.

### Button

| Variant   | Use                 |
| --------- | ------------------- |
| `primary` | Primary actions     |
| `ghost`   | Secondary (Refresh) |
| `default` | Standard surface    |

Supports all native `button` attributes. Focus ring via `--oacp-shadow-focus`.

### Toggle

Labeled checkbox for boolean settings (Live mode).

### SearchInput

Search field with icon and optional clear button. Supports `forwardRef` for programmatic focus (Day 19 `/` shortcut).

```tsx
const searchRef = useRef<HTMLInputElement>(null);

<SearchInput
  ref={searchRef}
  value={query}
  onChange={(event) => setQuery(event.target.value)}
  onClear={() => setQuery('')}
  aria-label="Search agents"
/>;
```

## Utility classes

Defined in `components.css` for layout composition in the Console app:

| Class                  | Purpose                   |
| ---------------------- | ------------------------- |
| `.oacp-empty`          | Empty state copy          |
| `.oacp-stats-grid`     | Three-column stats row    |
| `.oacp-select`         | Native `<select>` styling |
| `.oacp-header-actions` | Header toolbar flex row   |

## Accessibility

- `Panel` sets `aria-label` from title unless overridden
- `Button` and `Toggle` support `focus-visible` rings
- `SearchInput` requires `aria-label` when no visible label
- Poll interval `<select>` uses `oacp-select` with `aria-label` in Console header

## Console app components (Day 4+)

These live in `apps/console/src/` — not exported from `@oacp/ui`.

### AgentCard (Day 4 / Day 13)

Clickable agent row: display name, full URI, capability pills. **Active** when participating in the selected trace; **selected** accent ring on click (toggle). Fleet/role badges from Day 9/11 enrichment.

```tsx
<AgentCard
  agent={agent}
  isActiveInTrace={activeIds.has(agent.id)}
  isSelected={agent.id === selectedAgentId}
  isDimmed={showAll && !activeIds.has(agent.id)}
  onSelect={selectAgent}
/>
```

Fleet badge colors map to `--oacp-fleet-*` tokens (`mcplab`, `startup-demo`, `system`, `external`). Styling uses theme CSS variables only (`AgentCard.module.css`).

**Day 17 — fleet color ring:** each card has a 3px left border colored by fleet bucket (`data-fleet-bucket`). Unknown fleets use the `external` ring color.

### FleetSection (Day 17)

Collapsible fleet header for the agent catalog. Renders fleet display name, agent count, and chevron; body is a `<ul>` of `AgentCard` rows.

```tsx
<FleetSection
  fleetId="mcplab"
  agentCount={12}
  collapsed={false}
  onToggle={() => toggleFleetCollapsed('mcplab')}
>
  {agents.map((agent) => (
    <AgentCard key={agent.id} agent={agent} />
  ))}
</FleetSection>
```

| `data-testid`             | Purpose                |
| ------------------------- | ---------------------- |
| `fleet-section-<fleetId>` | Section wrapper        |
| `fleet-header-<fleetId>`  | Collapse toggle button |
| `fleet-count-<fleetId>`   | Agent count badge      |

Collapse state persists in `sessionStorage` (`oacp.console.fleetCollapse.v1`) via `useFleetCollapse`.

### AgentsPanel (Day 11 / Day 16 / Day 17 / Day 18 / Day 19 / Day 20)

Groups agents by fleet (`groupAgentsByFleet`) and supports search across name, URI, fleet, role, and capabilities.

**Day 16 — trace-scoped default:** when a trace is selected, the list shows only agents participating in that trace (`activeAgentIds`). Toggle **Show all registered** to reveal the full registry; out-of-trace agents render with reduced opacity (`isDimmed` / `data-out-of-trace="true"`). Scope label: `2 of 27 agents · In current trace`.

**Day 17 — fleet grouping:** visible agents render under collapsible fleet sections in order: MCPLab → Startup demo → System → External. Empty fleets are omitted.

**Day 18 — role taxonomy:** each card shows a compact `RoleBadge` (glyph + label) with fleet-toned colors. Roles resolve from metadata, then identity slug, then capability prefix. Footer `RoleLegend` lists role+fleet pairs in the filtered view.

**Day 19 — fuzzy search:** debounced query filters scoped agents; matching substrings highlight in `AgentCard`. Press `/` to focus the search field. Empty state: `data-testid="agents-search-empty"`.

**Day 20 — catalog filters:** `AgentCatalogToolbar` provides status, fleet, and in-trace chips plus sort (name, last seen, activity). Pipeline: trace scope → catalog filters → search → sort → fleet group. Filter state persists in `sessionStorage` (`oacp.console.catalogFilters.v1`).

**Day 23 — virtualization:** filtered fleet groups render through `VirtualizedAgentCatalog` (TanStack Virtual). `AgentDensityToggle` switches compact/detailed card layout (`sessionStorage`: `oacp.console.agentDensity.v1`).

**Day 24 — pins + row actions:** up to five pinned agents render in a **Pinned** section above fleet headers (`localStorage`: `oacp.console.pinnedAgents.v1`). Pinned agents stay visible in trace-scoped view (dimmed when out of trace). Each card has a **⋯** menu — copy URI, filter feed, focus in graph, pin/unpin. Row actions link panels via `linkAgentSelection` without opening the detail drawer.

**Day 25 — test consolidation:** `buildAgentCatalogView` in `agent-catalog-pipeline.ts` is the single pipeline used by `AgentsPanel`. Unit tests cover MCPLab demo scale (27+ agents). Run `pnpm --filter @oacp/console test:e2e:catalog` for the full Issue #1 Playwright suite. Usability checklist: [console-spec.md](../docs/console-spec.md#agent-catalog-usability-checklist-day-25).

Filter logic: `apps/console/src/utils/agent-trace-filter.ts` (`resolveAgentTraceScope`).  
Fleet logic: `apps/console/src/utils/fleet-catalog.ts` (`resolveFleetBucket`, `groupAgentsByFleet`).  
Role logic: `apps/console/src/utils/role-taxonomy.ts` (`resolveAgentRole`, `collectRoleLegendEntries`).  
Search logic: `apps/console/src/utils/agent-search.ts` (`searchAgents`, `SEARCH_DEBOUNCE_MS`).  
Catalog filter logic: `apps/console/src/utils/agent-catalog-filter.ts` (`filterAgentsByCatalog`, `sortAgentsForCatalog`).  
Pin logic: `apps/console/src/utils/pinned-agents.ts` (`splitPinnedAgents`).

| Test id                  | Purpose                                 |
| ------------------------ | --------------------------------------- |
| `agents-catalog-toolbar` | Filter + sort toolbar root              |
| `filter-status-<status>` | Status chip (`active`, `idle`, `error`) |
| `filter-fleet-<fleetId>` | Fleet chip                              |
| `filter-in-trace`        | In-trace-only chip (trace selected)     |
| `agents-sort-select`     | Sort dropdown                           |
| `agents-clear-filters`   | Reset filters + sort                    |
| `agents-search-empty`    | No matches (search and/or filters)      |

### AgentCatalogToolbar (Day 20)

Filter chips and sort select for the agent catalog. Fleet chips are derived from agents in the current trace scope (`listAvailableFleetFilters`).

```tsx
<AgentCatalogToolbar
  agents={scopedAgents}
  filters={catalogFilters}
  onToggleStatus={toggleStatus}
  onToggleFleet={toggleFleet}
  onToggleInTraceOnly={toggleInTraceOnly}
  onSortChange={setSort}
  onClearFilters={clearFilters}
  traceSelected={traceSelected}
/>
```

### AgentDetailDrawer (Day 21)

Slide-over panel for full agent context. Opens when an agent card is clicked (or from `?agent=` deep link). Does not unmount graph or message feed.

```tsx
<AgentDetailDrawer
  agent={detailAgent}
  isOpen={detailAgentId !== undefined}
  traces={traces}
  traceTimeline={data?.active_trace?.timeline}
  selectedTraceId={selectedTraceId}
  onClose={closeAgentDetail}
  onSelectTrace={selectTrace}
/>
```

| Test id                         | Purpose                               |
| ------------------------------- | ------------------------------------- |
| `agent-detail-drawer`           | Drawer root (`role="dialog"`)         |
| `agent-detail-backdrop`         | Dismiss backdrop                      |
| `agent-detail-close`            | Header close button                   |
| `agent-detail-copy-uri`         | Copy `agent://…` to clipboard         |
| `agent-detail-fingerprint`      | Truncated public key display          |
| `agent-detail-mcplab-config`    | MCPLab lab config link (mcplab fleet) |
| `agent-detail-capability-<cap>` | Capability pill in drawer             |
| `agent-detail-trace-<traceId>`  | Recent trace switch button            |

Detail helpers: `apps/console/src/utils/agent-detail.ts` (`formatPublicKeyFingerprint`, `collectAgentRecentTraces`, `collectAgentMessages`, `resolveMcplabAgentConfigUrl`).

### MessageFlowPanel (Day 8 / Day 22)

Renders the tail of the active trace timeline. When `selectedAgentId` is set (Day 22), the feed scopes to messages sent or received by that agent.

| Test id                    | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `feed-agent-filter-bar`    | Active agent filter banner                      |
| `feed-agent-filter-empty`  | No messages for selected agent in trace         |
| `feed-agent-filter-footer` | Footer note with filtered message count         |
| `feed-scroll-viewport`     | Scroll container for smart auto-scroll (Day 48) |
| `feed-new-messages-chip`   | Jump-to-bottom chip when scrolled up            |
| `feed-pause-toggle`        | Feed pause toggle in panel header               |
| `feed-scroll-root`         | Hover pause target (Day 49)                     |
| `feed-virtual-list`        | TanStack Virtual message list                   |
| `feed-filter-bar`          | Client-side feed filters                        |
| `feed-filter-type`         | Message type filter                             |
| `feed-filter-text`         | Free-text filter                                |
| `feed-filter-clear`        | Clear all feed filters                          |
| `feed-expand-<messageId>`  | Expand row detail                               |
| `feed-details-<messageId>` | Expanded JSON / latency panel                   |
| `feed-hover-paused-banner` | Hover pause buffered count                      |

Filter logic: `apps/console/src/utils/timeline-agent-filter.ts`.

### VirtualizedAgentCatalog (Day 23)

TanStack Virtual scroll surface for fleet-grouped agent rows. Flattens `FleetAgentGroup[]` into header + agent rows via `buildVirtualAgentRows`.

```tsx
<VirtualizedAgentCatalog
  fleetGroups={fleetGroups}
  pinnedAgents={pinnedAgents}
  density={density}
  activeAgentIds={activeAgentIds}
  selectedAgentId={selectedAgentId}
  isFleetCollapsed={isFleetCollapsed}
  isPinned={isPinned}
  canPin={canPin}
  onToggleFleet={toggleFleetCollapsed}
  onSelectAgent={handleAgentCardClick}
  onLinkAgent={linkAgentSelection}
  onTogglePin={togglePin}
/>
```

| Test id                   | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `agents-virtual-list`     | Virtual scroll container (`data-density`) |
| `agents-density-toggle`   | Compact / detailed control group          |
| `agents-density-compact`  | Compact density button                    |
| `agents-density-detailed` | Detailed density button                   |

### AgentCard density (Day 23)

| `density`  | Layout                                      |
| ---------- | ------------------------------------------- |
| `compact`  | `RoleBadge` + `shortAgentId` + status chips |
| `detailed` | Full card (name, fleet, URI, capabilities)  |

Set `virtualized` when rendered inside the virtual list (`role="listitem"` wrapper). When `virtualized`, the card shell includes `AgentRowActions` (Day 24).

### AgentRowActions + PinnedSectionHeader (Day 24)

Per-card overflow menu and pinned section header for the virtual catalog.

```tsx
<AgentRowActions
  agentId={agent.id}
  isPinned={isPinned}
  canPin={canPin}
  onFilterFeed={() => onLinkAgent(agent.id)}
  onFocusInGraph={() => onLinkAgent(agent.id)}
  onTogglePin={() => onTogglePin(agent.id)}
/>

<PinnedSectionHeader agentCount={pinnedAgents.length} />
```

| Test id                              | Purpose                        |
| ------------------------------------ | ------------------------------ |
| `pinned-section-header`              | Pinned section label           |
| `pinned-section-count`               | Pin count badge                |
| `agent-actions-<shortId>`            | Row actions trigger            |
| `agent-action-copy-uri-<shortId>`    | Copy URI menu item             |
| `agent-action-filter-feed-<shortId>` | Filter feed (cross-panel link) |
| `agent-action-focus-graph-<shortId>` | Focus in graph                 |
| `agent-action-pin-<shortId>`         | Pin / unpin toggle             |

Clipboard helper: `apps/console/src/utils/clipboard.ts` (`copyTextToClipboard`).

### RoleBadge (Day 18)

Compact role chip with monospace glyph and uppercase label. Colors blend fleet identity tokens (`--oacp-fleet-*`) with role tone slots.

```tsx
<RoleBadge role={resolvedRole} fleetId="mcplab" compact />
```

| Attribute                        | Purpose                                  |
| -------------------------------- | ---------------------------------------- |
| `data-role-id`                   | Canonical role token                     |
| `data-role-source`               | `metadata` \| `identity` \| `capability` |
| `data-testid="agent-role-badge"` | E2E / tests                              |

### RoleLegend (Day 18)

Footer legend listing distinct role+fleet pairs currently visible (respects trace scope and search).

```tsx
<RoleLegend entries={collectRoleLegendEntries(filteredAgents)} />
```

### SearchHighlight (Day 19)

Renders text with accent `<mark>` spans for matched substring ranges from `searchAgents()`.

```tsx
<SearchHighlight text={agent.name} ranges={highlights.name} />
```

### TraceRailRow (Day 5)

Clickable trace summary in the bottom rail: short id, message/agent meta, relative last-activity time. Selected row uses accent background and left border.

```tsx
<TraceRailRow trace={trace} isSelected={trace.traceId === selectedTraceId} onSelect={selectTrace} />
```

`TraceRail` composes a scrollable list with `role="listbox"` and scrolls the selected row into view on change.

### MessageFlowItem (Day 8)

Single timeline row in the message feed: summary, route meta (`from → to · capability`), and status accent border.

```tsx
<MessageFlowItem event={event} isNew={newIds.has(event.message_id)} />
```

`MessageFlowPanel` uses `useIncrementalMessageFeed` (Day 47): append-only merge by `message_id`, SSE `message.appended` via `message-feed-append-bus`, slide-in animation for new rows only. **Day 48:** `useMessageFeedScroll` auto-scrolls only within 50px of bottom; `FeedNewMessagesChip` when scrolled up; **Feed** pause toggle buffers updates. **Day 49:** `VirtualizedMessageFeed` (TanStack Virtual, up to `FEED_VIRTUAL_TAIL_LIMIT` rows), hover pause, `MessageFeedFilterBar`, expandable `MessageFlowItem` detail. See [console-message-feed.md](../console-message-feed.md).

### LegacyRingGraph (Day 10)

SVG circular delegation graph. Trace-scoped agents are placed on a ring; `agent_links` render as directed edges; trace participants use enlarged active nodes.

```tsx
<LegacyRingGraph
  agents={snapshot.agents}
  agentLinks={snapshot.agent_links}
  activeAgentIds={activeAgentIds}
  selectedAgentId={selectedAgentId}
/>
```

### OpsGraph (Day 27)

React Flow hierarchical DAG for Ops mode. Data comes from `useTraceGraph` (Day 26 trace graph API), not the snapshot ring layout.

```tsx
const { data: graph, isLoading } = useTraceGraph({
  traceId: selectedTraceId,
  pollIntervalMs: liveEnabled ? pollIntervalMs : false,
  enabled: Boolean(selectedTraceId),
});

<OpsGraph graph={graph} selectedAgentId={selectedAgentId} onSelectAgent={linkAgentSelection} />;
```

| Test id                      | Purpose                    |
| ---------------------------- | -------------------------- |
| `ops-graph`                  | React Flow canvas root     |
| `ops-graph-node-<agentId>`   | Circle node (sanitized id) |
| `ops-graph-edge-<from>-<to>` | Bezier delegation edge     |

Layout: `apps/console/src/graph/ops-graph-layout.ts` — dagre `TB`, overlap guard for 27+ nodes. Custom node type: `OpsAgentNode` (fleet ring, selection/dim states).

**Labels (Day 28):** No permanent on-node text. `OpsGraphLabel` renders hover tooltips and click-pinned labels via `NodeToolbar`. Formatting: `ops-graph-label.ts`. Pin state lives in `OpsGraph`; `Escape` clears pin.

**Edges (Day 29):** `OpsDelegationEdge` — bezier paths (`getBezierPath`), arrow markers, width ∝ `message_count`, color by `kind`. Hover tooltip via `EdgeLabelRenderer`. Styling helpers: `ops-graph-edge.ts`. `GraphPanel` footer shows per-kind legend in ops mode.

**Nodes (Day 30):** `ops-graph-node-style.ts` — idle 40px / active 52px; status-first `isOpsGraphNodeActive`. `OpsAgentNode` applies glow + `opsNodePulse` for active agents; selected ring without pulse; `@media (prefers-reduced-motion)` respected.

**Viewport (Day 31):** Wheel zoom + drag pan. **Fit view** / **Reset** live in the **Delegation graph** panel header (`OpsGraphViewportControls` via `Panel.headerActions`). React Flow `MiniMap` sits **bottom-right** on the canvas with an **Overview** label (pannable, zoomable). Double-click a node to focus (`ops-graph-viewport.ts`). Baseline viewport snapshot captured after fit; poll refreshes preserve operator pan/zoom on the same trace. Single-click label pin uses a 250ms delay so double-click does not toggle pin.

**Focus mode (Day 32):** Click graph node or catalog row to focus an agent. Focused node + 1-hop neighbors stay bright; others dim to 0.2 opacity (applied on the React Flow node wrapper via `node.style`, not the inner card — avoids compounding with `.idle` opacity). In/out edges emphasized; Escape clears focus. Shared `selectedAgentId` store syncs graph, catalog, and feed. Helpers: `ops-graph-focus.ts`.

**Trace replay (Day 33):** `TraceReplayScrubber` below the ops canvas when the trace has ≥2 messages. `useTraceReplay` in `ConsoleLayout` drives scrub index, play/pause, and 1×/2× speed. Graph uses `sliceTraceGraphForReplay`; feed shows prefix timeline with `data-scrub-active` row highlight and scroll sync. Helpers: `trace-replay.ts`.

**Registry ghosts (Day 34):** **Show full registry** in graph footer (shared `showAllRegisteredAgents` with catalog) merges out-of-trace registry agents as dashed orbital ghost nodes via `mergeRegistryGhostsIntoGraph` + `ops-graph-ghost-layout.ts`. Badge: `+N idle agents`. Suppressed during replay scrub.

**Sign-off (Day 35):** `OpsGraphLegend` component — idle, active, selected, edge kinds. Depth: `ops-graph-depth.ts`. Perf guard: 100-node layout. E2E: `mcplab-ops-graph.ts`, `console-ops-graph-day35.spec.ts`. Visual baseline: 30-agent screenshot.

### ShowcaseGraph (Day 36–43)

Three.js showcase graph for demos and launch video. Day 36–40: scaffold, layouts, labels, edge animation. **Day 41:** post-processing bloom, starfield/hex backdrop, presentation settings, GPU perf profile. **Day 42:** fleet orbital bands, per-fleet cluster layout, fleet legend + filter. **Day 43:** presentation mode auto-rotate camera, full-screen layout via URL.

```tsx
<ShowcaseGraph
  graph={traceGraph}
  agents={scopedAgents}
  activeAgentIds={activeAgentIds}
  selectedAgentId={selectedAgentId}
  layoutKind={showcaseLayout}
  timeline={activeTraceTimeline}
  liveEnabled={liveEnabled}
  bloomIntensity={showcaseBloom}
  fleetFilter={showcaseFleetFilter}
  onFleetFilterChange={setShowcaseFleetFilter}
  onSelectAgent={selectAgent}
  onClearFocus={clearAgentSelection}
/>
```

| Prop                     | Type                                      | Description                                                       |
| ------------------------ | ----------------------------------------- | ----------------------------------------------------------------- |
| `graph`                  | `TraceGraphView \| undefined`             | Trace graph from `useTraceGraph`                                  |
| `layoutKind`             | `'force' \| 'sphere'`                     | Force/star vs Fibonacci constellation (Day 38)                    |
| `agents`                 | `AgentObservabilityRecord[]`              | Fallback orbital placeholders when graph unavailable              |
| `activeAgentIds`         | `Set<string>`                             | Active agents get larger radius                                   |
| `selectedAgentId`        | `string \| undefined`                     | Selected sphere scale boost + pinned label (Day 39)               |
| `timeline`               | `TraceTimelineEvent[]`                    | Poll-based edge pulse source (Day 40)                             |
| `liveEnabled`            | `boolean`                                 | When false, suppresses live edge pulses                           |
| `bloomIntensity`         | `'off' \| 'low' \| 'medium' \| 'high'`    | Post-processing bloom level (Day 41)                              |
| `fleetFilter`            | `CatalogFleetId \| null`                  | Active fleet filter; `null` shows all fleets (Day 42)             |
| `onFleetFilterChange`    | `(fleet: CatalogFleetId \| null) => void` | Fleet legend chip handler (Day 42)                                |
| `presentationMode`       | `boolean`                                 | Full-screen kiosk mode — auto-rotate, hides fleet legend (Day 43) |
| `presentationTraceCycle` | `boolean`                                 | Shows auto-cycle hint in exit overlay (Day 43)                    |
| `onSelectAgent`          | `(agentId: string) => void`               | Catalog/graph selection sync (Day 39)                             |
| `onClearFocus`           | `() => void`                              | Escape / clear focus handler (Day 39)                             |

**Force layout (Day 37):** `layoutShowcaseForceGraph` / `layoutShowcaseStarGraph` — small traces use hub-and-spoke; large traces use `d3-force-3d`.

**Sphere layout (Day 38):** `layoutShowcaseSphereGraph` — Fibonacci shells; MCPLab/System inner band (`4.0`), Startup/External outer (`5.8`); great-circle arc edges via `showcase-graph-arc-edges.ts`; wireframe constellation shells in canvas.

**Labels + focus (Day 39):** No permanent on-sphere text. Hover a node for a single tooltip; click (graph or catalog) pins one label and runs `ShowcaseCameraFocus` to frame the node. `Escape` clears pin. Formatting reuses `ops-graph-label.ts` via `buildShowcaseGraphLabelView`.

**Edge animation (Day 40):** Active edges glow; idle edges dim (`showcase-graph-edge-style.ts`). New timeline messages enqueue particle pulses along edge paths (`useShowcaseEdgePulses`). Day 46 SSE calls `enqueueShowcaseEdgePulse`. `prefers-reduced-motion` renders static edges only.

**Bloom + backdrop (Day 41):** `@react-three/postprocessing` bloom on active/selected nodes and pulsing edges. `ShowcaseBackdrop` renders starfield + hex grid. **ShowcasePresentationSettings** toggles bloom intensity; URL `showcase_bloom=`. Integrated GPUs auto-cap bloom for 45fps.

**Fleet clustering (Day 42):** `ShowcaseFleetOrbitalBands` renders cyan MCPLab and amber startup-demo wireframe rings. Force/star layouts group nodes by fleet bucket with spatial offsets. **ShowcaseFleetLegend** provides All + per-fleet filter chips; selecting a fleet dims other fleets in 3D. URL `showcase_fleet=`. Single-fleet operator views hide wireframe bands unless presentation mode is active.

**Presentation mode (Day 43):** `?presentation=1` hides console chrome for kiosk/conference demos. Auto-rotate camera pauses on interaction and resumes after 12s idle. Optional `presentation_cycle=1` rotates traces every 60s (`presentation_cycle_sec=` override). **Present** button in Showcase graph header. `Esc` exits presentation mode.

**Ops ↔ Showcase sync (Day 44):** Trace and agent selection persist across mode toggles. Ops pinned labels follow catalog selection. **PNG** button exports 1920×1080 graph images for README and docs.

**Performance + sign-off (Day 45):** `showcase-performance-budget.ts` defines CPU layout and 30/100-node FPS targets. Vitest enforces force simulation budgets; manual QA uses [console-showcase-qa-checklist.md](./console-showcase-qa-checklist.md). E2E sign-off: `console-showcase-signoff.spec.ts`. **Issue #2 closed** — Showcase is the launch demo surface; Ops remains the operator layer.

**GraphModeToggle** switches Ops ↔ Showcase; **ShowcaseLayoutToggle** switches Force ↔ Sphere. URL: `?mode=showcase&showcase_layout=sphere&showcase_bloom=medium&presentation=1`.

| Test id / attribute                                                 | Purpose                                           |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| `showcase-graph`                                                    | Three.js canvas root                              |
| `data-showcase-layout`                                              | `force`, `sphere`, or `placeholder`               |
| `data-showcase-edge-shape`                                          | `line` or `arc`                                   |
| `data-showcase-focused-agent`                                       | Currently focused agent id (Day 39)               |
| `data-showcase-visible-label-count`                                 | Hover + pinned label count (Day 39)               |
| `data-showcase-edge-animation`                                      | `enabled` or `static` (Day 40)                    |
| `data-showcase-edge-active-count` / `data-showcase-edge-idle-count` | Edge traffic styling (Day 40)                     |
| `data-showcase-pulse-count` / `data-showcase-pulse-total`           | Live pulse metrics (Day 40)                       |
| `data-showcase-bloom` / `data-showcase-bloom-effective`             | Bloom settings (Day 41)                           |
| `data-showcase-gpu-profile`                                         | `integrated` \| `dedicated` \| `unknown` (Day 41) |
| `data-showcase-backdrop`                                            | `starfield-hex` (Day 41)                          |
| `data-showcase-fleet-count` / `data-showcase-fleet-filter`          | Fleet clustering (Day 42)                         |
| `showcase-fleet-legend`                                             | Fleet legend overlay (Day 42)                     |
| `showcase-fleet-filter-all` / `showcase-fleet-filter-<fleet>`       | Fleet filter chips (Day 42)                       |
| `console-presentation-mode`                                         | Full-screen presentation layout root (Day 43)     |
| `showcase-presentation-controls` / `showcase-presentation-enter`    | Present + Cycle toolbar (Day 43)                  |
| `graph-export-png`                                                  | Download Ops/Showcase graph PNG (Day 44)          |
| `data-graph-export-mode`                                            | `ops` or `showcase` export target (Day 44)        |
| `showcase-presentation-exit-hint`                                   | Esc exit hint overlay (Day 43)                    |
| `data-showcase-presentation` / `data-showcase-auto-rotate`          | Presentation camera state (Day 43)                |
| `data-showcase-orbital-bands`                                       | `visible` or `hidden` band gating (Day 43)        |
| `showcase-presentation-settings`                                    | Bloom intensity toolbar (Day 41)                  |
| `showcase-bloom-off` / `-low` / `-medium` / `-high`                 | Bloom intensity buttons                           |
| `showcase-graph-label-pinned-<id>`                                  | Click-pinned Html label                           |
| `showcase-graph-label-hover-<id>`                                   | Hover tooltip label                               |
| `showcase-layout-toggle`                                            | Force / Sphere switcher                           |
| `showcase-layout-force` / `showcase-layout-sphere`                  | Layout buttons                                    |
| `data-showcase-node-count`                                          | Rendered node count                               |
| `data-showcase-edge-count`                                          | Rendered edge count                               |
| `graph-mode-toggle`                                                 | Ops / Showcase switcher                           |
| `graph-mode-ops` / `graph-mode-showcase`                            | Mode buttons                                      |

**Ops graph test ids (continued):**
| `ops-graph-legend-idle` / `-active` / `-selected` | Node state swatches |
| `ops-graph-legend-edge-<kind>` | Per-kind edge colors |
| `ops-graph-pinned-label-<id>` | Click-pinned label (one at a time) |
| `ops-graph-edge-<from>-<to>-<n>` | Delegation edge group |
| `ops-graph-edge-<from>-<to>-<n>-tooltip` | Edge hover tooltip |
| `ops-graph-viewport-controls` | Fit / Reset toolbar |
| `ops-graph-fit-view` | Fit entire trace DAG |
| `ops-graph-reset-view` | Restore baseline framing |
| `trace-replay-scrubber` | Replay control bar |
| `trace-replay-slider` | Message index slider |
| `trace-replay-play` / `trace-replay-pause` | Replay transport |
| `trace-replay-go-live` | Exit replay to live tail |
| `ops-graph-show-all-toggle` | Show full registry in graph |
| `ops-graph-ghost-badge` | +N idle agents warning |
| `data-replay-active` | Ops graph frozen in replay mode |
| `data-scrub-active` | Feed row at scrub index |
| `data-registry-expanded` | Ghost nodes rendered |
| `data-ghost` | Registry-only orbital node |
| `data-focus-active` | Focus mode active on ops graph root |
| `data-focus-role` | `focused` \| `neighbor` \| `dimmed` \| `none` on nodes |
| `data-node-visual` | `idle` \| `active` \| `selected` \| `ghost` on ops nodes |

`GraphPanel` selects the renderer via `VITE_GRAPH_MODE` or URL `?mode=` (`legacy` default). **Ops 2D** and **Showcase 3D** switch at runtime via `GraphModeToggle`; `mode` syncs to the URL through `selection-url.ts`.

```bash
pnpm --filter @oacp/console test -- showcase-graph-force showcase-graph-sphere-layout showcase-graph-arc-edges showcase-graph-label showcase-graph-camera-focus showcase-graph-edge-style showcase-graph-edge-pulse showcase-graph-bloom showcase-graph-node-bloom showcase-bloom-settings showcase-graph-placeholders
pnpm --filter @oacp/console test:e2e --grep "Ops 2D|Day 35|Day 36|Day 37|Day 38|Day 39|Day 40|Day 41|Day 42|Day 43|Day 44|Day 45"
pnpm --filter @oacp/console test:e2e:showcase
```

## Development

```bash
pnpm --filter @oacp/ui build
pnpm --filter @oacp/ui typecheck
```

Peer dependencies: `react`, `react-dom` (^18 || ^19).

## Related

- [console.md](./console.md) — Console app guide
- [console-architecture.md](./console-architecture.md) — layout structure
