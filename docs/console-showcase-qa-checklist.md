# Showcase manual QA checklist (Issue #2 sign-off)

Manual verification before MCPLab launch demos, README hero capture, or conference presentations. Automated coverage: `pnpm --filter @oacp/console test:e2e:showcase`.

**Prerequisites**

- OACP server or MCPLab Docker stack running with a recent crew trace
- Chrome or Edge (WebGL + `WEBGL_debug_renderer_info` for GPU profile)
- Console dev: `pnpm --filter @oacp/console dev` or production build served at `/console`

## 1. Mode and URL

| Step | Action                                 | Expected                                                       |
| ---- | -------------------------------------- | -------------------------------------------------------------- |
| 1.1  | Open `/?trace_id=<uuid>&mode=showcase` | WebGL canvas visible; header shows **Showcase 3D**             |
| 1.2  | Toggle **Ops 2D** → **Showcase 3D**    | No full page reload; URL updates `mode=`                       |
| 1.3  | Select agent in catalog                | Showcase focuses camera; `data-showcase-focused-agent` matches |
| 1.4  | Switch to Ops with same agent          | Ops zooms to pinned node; trace unchanged                      |

## 2. MCPLab 27-agent trace

Use a trace from a full MCPLab crew run (27+ registered agents, 20+ delegation edges).

| Step | Action                 | Expected                                                                 |
| ---- | ---------------------- | ------------------------------------------------------------------------ |
| 2.1  | Load trace in Showcase | Force layout (`data-showcase-layout=force`); ~27 nodes                   |
| 2.2  | Orbit with mouse       | All major hub→worker edges visible (lines or arcs per layout mode)       |
| 2.3  | Hover nodes            | Single hover label; no label spam on all nodes                           |
| 2.4  | Click node             | Selection syncs to agent catalog and URL `?agent=`                       |
| 2.5  | Fleet legend           | MCPLab fleet chip filters nodes; **All** restores full graph             |
| 2.6  | Integrated laptop GPU  | Bloom effective **low** or **medium**; no sustained stutter below 45 fps |

**Pass criteria:** No edges completely hidden behind nodes at default zoom; coordinator/hub nodes readable; delegation structure obvious within 30 seconds of orbit.

## 3. Presentation mode (launch video)

| Step | Action                                     | Expected                                                        |
| ---- | ------------------------------------------ | --------------------------------------------------------------- |
| 3.1  | Click **Present** or add `?presentation=1` | Header, catalog, feed, trace rail hidden; graph fills viewport  |
| 3.2  | Wait ~5 s                                  | Auto-rotate camera active (`data-showcase-auto-rotate=enabled`) |
| 3.3  | Multi-fleet trace                          | Orbital wireframe bands visible in presentation                 |
| 3.4  | Single-fleet trace                         | Bands hidden in normal mode; visible in presentation            |
| 3.5  | Press **Escape**                           | Returns to standard layout; graph panel not stuck oversized     |
| 3.6  | Optional **Cycle**                         | Trace rotates on interval when enabled                          |

## 4. Export and hero asset

| Step | Action                        | Expected                                                                              |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------- |
| 4.1  | Click **PNG** in Showcase     | Downloads 1920×1080 PNG; nodes and edges legible                                      |
| 4.2  | Regenerate hero (maintainers) | `CAPTURE_HERO=1 pnpm --filter @oacp/console capture:hero` updates `showcase-hero.png` |

## 5. Performance spot-check

See [console-performance-budget.md](./console-performance-budget.md).

| Step | Action                        | Expected                                 |
| ---- | ----------------------------- | ---------------------------------------- |
| 5.1  | 27-node trace, dedicated GPU  | ≥60 fps while orbiting with bloom medium |
| 5.2  | 27-node trace, integrated GPU | ≥45 fps with bloom capped to low         |
| 5.3  | Ops 100-node fixture (dev)    | Layout feels instant (&lt;500 ms)        |

## 6. Ops fallback (enterprise)

| Step | Action                             | Expected                                               |
| ---- | ---------------------------------- | ------------------------------------------------------ |
| 6.1  | Switch to **Ops 2D** on same trace | Bezier edges, minimap, zoom/pan; ghost registry toggle |
| 6.2  | Dense trace                        | Readable separation; edge kinds in legend              |

## Sign-off

| Role          | Name | Date | Notes                               |
| ------------- | ---- | ---- | ----------------------------------- |
| Engineering   |      |      | Vitest + Playwright green           |
| Design / demo |      |      | Aesthetic approved for launch video |

**Issue #2 closure:** Ops (Week 7) + Showcase (Week 9) together resolve cluttered graph and hidden edges. Showcase is the **launch demo surface**; Ops remains the **operator debugging layer**.

## Automated commands

```bash
pnpm --filter @oacp/console test -- showcase-performance-budget
pnpm --filter @oacp/console test:e2e:showcase
pnpm --filter @oacp/console test:e2e --grep "Showcase"
```
