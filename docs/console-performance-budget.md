# Console performance budget

Enterprise performance targets for the OACP Console graph stack. **CPU layout budgets** are enforced in Vitest; **runtime FPS** targets are validated manually before release demos (see [console-showcase-qa-checklist.md](./console-showcase-qa-checklist.md)).

Source of truth for constants: `apps/console/src/graph/showcase-performance-budget.ts`.

## Summary

| Surface         | Metric                      | 30 nodes    | 100 nodes      |
| --------------- | --------------------------- | ----------- | -------------- |
| **Ops 2D**      | Layout (CPU)                | —           | **&lt;500 ms** |
| **Showcase 3D** | Force simulation (CPU)      | **&lt;3 s** | **&lt;8 s**    |
| **Showcase 3D** | Frame rate (dedicated GPU)  | **≥60 fps** | **≥45 fps**    |
| **Showcase 3D** | Frame rate (integrated GPU) | **≥45 fps** | **≥30 fps**    |

Ops 2D is the **default operator layer** — it must stay fast on laptops without a discrete GPU. Showcase 3D is the **launch demo layer** — acceptable to trade frame rate on integrated GPUs when bloom and post-processing are enabled.

## Ops 2D graph (Week 7)

| Budget                    | Value                                     | Enforcement                |
| ------------------------- | ----------------------------------------- | -------------------------- |
| Dagre layout, 100 nodes   | &lt;500 ms                                | `ops-graph-layout.test.ts` |
| Node separation, 30 nodes | Min center distance ≥ idle diameter + gap | `ops-graph-layout.test.ts` |

Ops mode uses SVG/React Flow with bezier edges, z-order, and ghost registry nodes. It closes **Issue #2** for day-to-day debugging (Week 7 sign-off).

## Showcase 3D graph (Weeks 8–9)

### Force simulation (main thread)

| Node count | Budget | Notes                                       |
| ---------- | ------ | ------------------------------------------- |
| ≤30        | 3 s    | MCPLab crew traces (~27 agents)             |
| 31–100     | 8 s    | Large traces; star layout used for ≤6 nodes |

Simulation uses `d3-force-3d` with link, charge, center, and collide forces. Layout runs once per trace graph fetch; results are cached until trace or fleet filter changes.

### Runtime frame rate (GPU)

Measured with Chrome DevTools **Performance** panel or an in-page FPS meter while orbiting the graph with edge animation and bloom enabled.

| Profile        | Detection                    | Bloom default     | 30-node floor | 100-node floor |
| -------------- | ---------------------------- | ----------------- | ------------- | -------------- |
| **Dedicated**  | Discrete GPU renderer string | Medium            | 60 fps        | 45 fps         |
| **Integrated** | Intel / Apple / SwiftShader  | Low (auto-capped) | 45 fps        | 30 fps         |

Integrated GPU detection: `showcase-graph-gpu-profile.ts` reads `WEBGL_debug_renderer_info` and caps bloom via `capShowcaseBloomIntensityForGpu`.

### Mitigations when below budget

1. Switch to **Ops 2D** for investigation (`?mode=ops` or graph mode toggle).
2. Lower bloom: **Off** or **Low** in Showcase presentation settings (`showcase_bloom=low`).
3. Disable edge animation: `showcase_animate=0` (URL) or static edges in settings.
4. Use **fleet filter** to reduce visible nodes during multi-fleet traces.
5. Single-fleet operator views hide orbital wireframe bands unless presentation mode is active.

## Agent catalog (reference)

| Metric                        | Target     |
| ----------------------------- | ---------- | -------------------------------- |
| Filter 500 agents             | &lt;100 ms | `agent-catalog-pipeline.test.ts` |
| Virtualized scroll, 100+ rows | 60 fps     | E2E + manual                     |

## Automated test commands

```bash
# CPU layout budgets (Ops + Showcase)
pnpm --filter @oacp/console test -- showcase-performance-budget ops-graph-layout showcase-graph-force

# Issue #2 Showcase sign-off (Playwright)
pnpm --filter @oacp/console test:e2e:showcase

# Full Showcase regression suite (Days 36–45)
pnpm --filter @oacp/console test:e2e --grep "Showcase|Day 44|Day 45"
```

## Related documentation

- [console-showcase-qa-checklist.md](./console-showcase-qa-checklist.md) — manual QA before launch demos
- [console-spec.md](./console-spec.md) — graph mode contract and test ids
- [console-components.md](./console-components.md) — Showcase bloom, presentation, fleet clustering
- [version1.md](./version1.md) — Day 35 (Ops) and Day 45 (Showcase) acceptance logs
