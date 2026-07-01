# Launch demo (Day 57)

> **v1.0 launch decision:** The recorded MP4 is **skipped** for v1.0.0. The README **hero image**, [demo scripts](./demo-scripts.md), and `pnpm docker:mcplab` quick start are the launch demo surface. This page keeps an optional recording script if you add a video later (e.g. on `v1.0.0` GitHub Release).

**Try it now (no video required):**

```bash
pnpm docker:mcplab
# or: docker compose --profile demo up seed-demo
```

Open **http://127.0.0.1:3847/console/?mode=showcase** — presenter walkthrough: [demo-scripts.md](./demo-scripts.md).

**Poster / hero frame (Console Showcase, not legacy playground):**

![OACP Console Showcase hero](./public/screenshots/console-showcase-hero.png)

---

## Optional video (deferred)

A 60–90 second screen recording was planned for README and Release assets. **Not required** for ship — fallback fixtures are too sparse for a good recording; a live MCPLab run or 27-agent hero capture would be needed. Skip unless you want post-launch marketing.

| Channel                   | Status                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------- |
| **YouTube / Release MP4** | _Deferred — not blocking v1.0.0_                                                       |
| **Local file**            | [docs/public/demo/oacp-v1-launch.mp4](./public/demo/oacp-v1-launch.mp4) if added later |
| **Live demo**             | [demo-scripts.md](./demo-scripts.md) — 5- and 10-minute presenter scripts              |

> **If you record later:** upload to [GitHub Releases](https://github.com/naaa-G/OACP/releases) or YouTube, then add the URL here and in [README.md](../README.md).

---

## 90-second script (voiceover)

| Time | Visual                                                      | Narration                                                                                                |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 0:00 | Console Showcase empty → MCPLab web                         | "OACP v1 is a protocol and platform for multi-agent collaboration you can actually observe."             |
| 0:10 | Start research crew (live MCPLab — **not** `demo:fallback`) | "MCPLab runs research, code, and ops crews on OACP — each role is a registered agent with capabilities." |
| 0:25 | Message feed scrolling                                      | "Every task and delegation is a typed protocol message — correlated by trace ID."                        |
| 0:35 | Showcase graph — fleet filter mcplab                        | "The Console Showcase view renders your fleet in 3D — filter by MCPLab, focus agents, follow live SSE."  |
| 0:50 | Click coordinator node, pinned label                        | "Pin an agent, read the feed, export the graph — same data powers the public observability API."         |
| 1:05 | Quick Ops mode on ops trace                                 | "Ops mode shows delegation hierarchy for incident response crews."                                       |
| 1:15 | Terminal: `docker compose up` or recreate OACP              | "Traces persist in SQLite; recreate OACP and MCPLab Postgres backfills history automatically."           |
| 1:25 | Logo / URLs                                                 | "OACP v1.0 — open protocol, Docker-ready, MCPLab reference lab. Links in the README."                    |

Full presenter runbooks: [demo-scripts.md](./demo-scripts.md).

---

## Recording setup (enterprise quality)

| Setting    | Recommendation                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------- |
| Resolution | **1920×1080** (matches hero capture)                                                           |
| Frame rate | 30 fps                                                                                         |
| Browser    | Chrome/Edge, 125% zoom max for legibility                                                      |
| Stack      | `pnpm docker:mcplab` — **do not** record from `pnpm demo:fallback` (2 agents, 3 messages only) |
| Audio      | External mic; record room tone separately if needed                                            |
| Tool       | OBS Studio, Loom, or ScreenFlow — export H.264 MP4                                             |

**Console URL for Showcase beat:**

```text
http://127.0.0.1:3847/console/?trace_id=<uuid>&mode=showcase&showcase_fleet=mcplab&showcase_layout=sphere&showcase_bloom=medium&presentation=1
```

**Pre-flight:**

```bash
pnpm demo:rehearse          # automated 2-round gate
pnpm demo:fallback          # fixed traces if LLM unavailable
```

Log each take in [demo-recordings.md](./demo-recordings.md).

---

## Optional Showcase GIF

For README or social preview (15–20 s loop):

1. Open Showcase with `presentation=1&presentation_cycle=1`
2. Record 5–10 s with OBS or ScreenToGif
3. Export as WebP or GIF (≤15 MB for GitHub README)
4. Save to `docs/public/demo/oacp-v1-showcase-loop.webp`

Or regenerate the static hero:

```bash
# Requires console deps installed (pnpm install) and Playwright browsers
CAPTURE_HERO=1 pnpm capture:hero
```

Outputs:

- `apps/console/public/showcase-hero.png`
- `docs/public/screenshots/console-showcase-hero.png`

---

## Acceptance checklist (Day 57)

- [x] **Video skipped** for v1.0.0 — hero + demo scripts + Docker quick start suffice
- [x] Hero image is Console Showcase (`console-showcase-hero.png`), not `/playground`
- [x] README and docs link to runnable demo ([demo-scripts.md](./demo-scripts.md))
- [ ] Optional MP4 / GIF — post-launch only

---

## Related

- [demo-scripts.md](./demo-scripts.md) — live presentation
- [load-security-smoke.md](./load-security-smoke.md) — enterprise auth + SSE limits
- [mcplab-full-loop.md](./mcplab-full-loop.md) — integration contract
