# Demo scripts (Day 56)

Presenter runbooks for **OACP v1.0 + MCPLab** joint launch demos. Use these for conference dry-runs, customer calls, and internal sign-off before Day 57 video capture.

## Prerequisites

| Requirement              | Command / URL                                                              |
| ------------------------ | -------------------------------------------------------------------------- |
| Full stack (recommended) | `pnpm docker:mcplab`                                                       |
| OACP only + fixtures     | `pnpm docker:up` then `pnpm demo:fallback`                                 |
| Console                  | [http://127.0.0.1:3847/console/](http://127.0.0.1:3847/console/)           |
| MCPLab web               | [http://127.0.0.1:3002](http://127.0.0.1:3002) (or `MCPLAB_WEB_HOST_PORT`) |
| API key (if enabled)     | Set `OACP_API_KEY` in `.env` — gateway injects auth for browser            |

**Rehearsal automation (no presenter required):**

```bash
pnpm demo:rehearse          # imports fixtures + validates snapshot (2 rounds)
pnpm --filter @oacp/server test -- demo-rehearsal
```

---

## 5-minute script — Research crew → Showcase

**Audience message:** _MCPLab runs multi-agent crews on OACP; the Console is the live observability surface._

### 0:00 — Open on Console home

1. Open `http://127.0.0.1:3847/console/?mode=showcase`
2. Point out **Ops vs Showcase** toggle — stay in **Showcase** for the wow moment

### 0:30 — Start MCPLab research crew

**Live path (LLM + network):**

```bash
# MCPLab venv / container
mcplab run research --remote --topic "Edge AI inference trends for enterprise rollout"
```

Or from MCPLab web: **Research** → enter topic → **Run**.

**Fallback path (no LLM):**

```bash
pnpm demo:fallback
# Open research URL printed by the script
```

Fixed fallback trace:

`http://127.0.0.1:3847/console/?trace_id=d5610001-0001-4000-8000-000000000001&mode=showcase&showcase_fleet=mcplab`

### 1:30 — Follow live messages

1. Paste Console URL from `mcplab run` output (`console_url` / `trace_id`)
2. Show **message feed** updating (SSE-primary)
3. Highlight **fleet=mcplab** agents in the catalog (≥5 roles: coordinator → publisher)

### 2:30 — Showcase graph

1. Confirm `?mode=showcase` in URL
2. Enable **fleet filter → mcplab** (`showcase_fleet=mcplab`)
3. Click **coordinator** node → pinned label + camera focus
4. Optional: `showcase_layout=sphere`, `showcase_bloom=medium`

### 3:30 — Delegation story

1. Select a **task_request** in the feed — show `from` / `to` / `capability`
2. Mention OACP protocol: typed messages, `trace_id`, idempotent import for persistence

### 4:30 — Close

1. MCPLab run row → **Open Console** deep link (same trace after sync)
2. One-liner: _Recreate OACP container — traces backfill from MCPLab Postgres (Day 53)_

---

## 10-minute script — Three crews + Ops drill-down

### 0:00 — Setup (pre-show)

```bash
pnpm docker:mcplab
pnpm demo:fallback    # ensures three traces even if live runs fail later
```

### 1:00 — Research crew (Showcase) — _3 min_

Same as 5-minute script using research trace or live run.

### 4:00 — Code patch crew (Showcase) — _3 min_

**Live:**

```bash
mcplab run code --remote --task "Add rate limiting middleware to auth service"
```

**Fallback URL:**

`http://127.0.0.1:3847/console/?trace_id=d5610002-0002-4000-8000-000000000002&mode=showcase&showcase_fleet=mcplab`

Talking points: coder + reviewer delegation, artifact-oriented output, same Console surface.

### 7:00 — Ops crew (Ops mode) — _3 min_

**Live:**

```bash
mcplab run ops --remote --incident "Elevated 5xx on checkout API"
```

**Fallback URL:**

`http://127.0.0.1:3847/console/?trace_id=d5610003-0003-4000-8000-000000000003&mode=ops`

1. Switch graph mode to **Ops** (or use URL `mode=ops`)
2. Show hierarchical delegation layout — coordinator → ops → researcher
3. Drill into **agent detail drawer** from catalog
4. Cross-link: pin agent → feed filters → graph focus

### 9:30 — Platform wrap

1. `GET /v1/observability/snapshot` — same data the Console uses
2. Enterprise: `OACP_API_KEY`, SSE `api_key` query param, 10 connections/IP rate limit ([load-security-smoke.md](./load-security-smoke.md))

---

## Fallback fixtures (LLM / network down)

| Crew       | trace_id                               | Console mode |
| ---------- | -------------------------------------- | ------------ |
| Research   | `d5610001-0001-4000-8000-000000000001` | Showcase     |
| Code patch | `d5610002-0002-4000-8000-000000000002` | Showcase     |
| Ops        | `d5610003-0003-4000-8000-000000000003` | Ops          |

**Seed command:**

```bash
pnpm demo:fallback
# or
docker compose --profile demo up seed-demo        # single research trace (lighter)
docker compose run --rm -v ./docker:/scripts:ro node:20-bookworm-slim \
  node /scripts/../scripts/demo-fallback-seed.mjs # three-crew import
```

Fixture source: `scripts/demo-fixtures/crews.json` → `POST /v1/observability/import`.

MCPLab dry-run (local, no external LLM): set `MCPLAB_LLM_DRY_RUN=true` in `MCPLab/.env`.

---

## Rehearsal checklist

Run **twice** before recording Day 57 video:

- [ ] `pnpm demo:rehearse` exits 0 (2 rounds)
- [ ] Research Showcase: 5+ mcplab agents visible, graph renders
- [ ] Code patch Showcase: delegation visible in feed
- [ ] Ops mode: hierarchy + agent drawer
- [ ] Live MCPLab run completes OR fallback URLs used without apology
- [ ] No console errors in browser devtools network tab
- [ ] Optional: record screen + keep trace_ids in `docs/demo-recordings.md` notes

**Automated gate:**

```bash
pnpm --filter @oacp/server test -- demo-rehearsal
```

---

## Troubleshooting

| Symptom                                  | Fix                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Empty trace rail after OACP recreate     | `mcplab sync-oacp` or restart OACP with `OACP_IMPORT_FROM_MCPLAB=1`                                             |
| 401 on snapshot                          | Set gateway `OACP_API_KEY` or pass `Authorization: Bearer`                                                      |
| MCPLab crew fails instantly              | Use `pnpm demo:fallback` or `MCPLAB_LLM_DRY_RUN=true`                                                           |
| Mailbox worker errors in coordinator log | Restart coordinator after OACP healthy: `docker compose -f MCPLab/docker-compose.yml up -d --build coordinator` |
| Showcase slow on laptop                  | `showcase_bloom=low`, filter `showcase_fleet=mcplab`                                                            |

---

## Related

- [mcplab-full-loop.md](./mcplab-full-loop.md) — integration contract
- [load-security-smoke.md](./load-security-smoke.md) — Day 55 enterprise smoke
- [docker-compose.md](./docker-compose.md) — stack topology
- [console-spec.md](./console-spec.md) — URL params reference
