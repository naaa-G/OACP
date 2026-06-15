# Launch day playbook (Day 30)

Step-by-step guide for publishing OACP publicly. Complete the [Launch kit](./launch-kit.md) checklist first, then follow this playbook.

**Repository:** [github.com/naaa-G/OACP](https://github.com/naaa-G/OACP)  
**Docs site:** [naaa-g.github.io/OACP](https://naaa-g.github.io/OACP)

## Pre-flight (T-24h)

- [ ] `pnpm verify` passes locally and [CI](https://github.com/naaa-G/OACP/actions) is green on `main`
- [ ] `pnpm docs:build` succeeds
- [ ] Repo URLs match [`docs/.vitepress/repo.mjs`](./.vitepress/repo.mjs)
- [ ] Optional: demo video uploaded (YouTube/Vimeo) — link in release notes
- [ ] Optional: screenshots in `docs/public/screenshots/` per [screenshots.md](./screenshots.md)
- [ ] Review copy below; customize only if positioning changed

## Timeline (suggested)

| Time (UTC) | Action                                                |
| ---------- | ----------------------------------------------------- |
| T-24h      | Final `pnpm verify`, tag release, upload demo video   |
| T-0        | GitHub repo public + Release `v0.1.0-alpha`           |
| T+15m      | Hacker News Show HN                                   |
| T+30m      | Reddit posts (stagger 30–60 min apart)                |
| T+1h       | X / LinkedIn thread with playground GIF or video link |

After publish, follow [Post-launch runbook](./post-launch.md) for week 1 triage.

## GitHub release

**Tag:** `v0.1.0-alpha`  
**Title:** OACP v0.1.0-alpha — multi-agent collaboration you can see live

**Release notes:** copy from [`.github/RELEASE_v0.1.0-alpha.md`](https://github.com/naaa-G/OACP/blob/main/.github/RELEASE_v0.1.0-alpha.md) or run:

```bash
./scripts/tag-release.sh v0.1.0-alpha   # macOS/Linux
.\scripts\tag-release.ps1               # Windows
```

**Body preview:**

```markdown
## OACP — Open Agent Collaboration Protocol

Multi-agent task execution with a **live playground**. Run one command and watch agents collaborate.

### Try it

\`\`\`bash
git clone https://github.com/naaa-G/OACP.git
cd OACP && pnpm install && pnpm build
pnpm oacp run "build todo app" --keep-alive
\`\`\`

### Highlights

- Protocol-first JSON Schema messages (v0.1)
- Reference HTTP server + TypeScript & Python SDKs
- DAG workflows, delegation graphs, shared memory
- Live playground — agents as nodes, message flow, trace deep links
- LangChain & AutoGen adapters

### Status

Early alpha. APIs may change. Not production-ready.

### Links

- [Quick start](https://naaa-g.github.io/OACP/quick-start)
- [Architecture diagram](https://naaa-g.github.io/OACP/architecture-diagram.svg)
- [Community & support](https://naaa-g.github.io/OACP/community)
- Demo video: _add YouTube/Vimeo URL when ready_
```

### Make the repository public

1. GitHub → **Settings** → **General** → **Danger zone** → **Change repository visibility** → Public
2. **Settings** → **Pages** → Build and deployment: **GitHub Actions**
3. Confirm workflow [`.github/workflows/docs.yml`](../.github/workflows/docs.yml) deployed the site

## Hacker News — Show HN

**Title:** Show HN: OACP – multi-agent collaboration with a live playground

**Post URL:** https://github.com/naaa-G/OACP (or https://naaa-g.github.io/OACP/quick-start)

**Comment (first reply, post immediately):**

> Author here. OACP is an open protocol + reference implementation for multi-agent task execution.
>
> Differentiator: you can **watch** agents collaborate in a live playground (delegation graph + message timeline), not just read logs.
>
> Quick try: `git clone https://github.com/naaa-G/OACP.git && cd OACP && pnpm install && pnpm build && pnpm oacp run "build todo app" --keep-alive` then open the playground URL.
>
> Alpha / Apache 2.0. Feedback welcome — especially on protocol design and DX.

**Tips:**

- Post Tuesday–Thursday, 8–10 AM US Pacific
- Respond to comments within the first 2 hours
- Be honest about alpha status and crowded agent-protocol space

## Reddit

### r/MachineLearning

**Title:** [P] OACP – Open Agent Collaboration Protocol with live multi-agent playground (alpha)

**Body:**

```markdown
We built OACP — a protocol + reference stack for multi-agent task routing, delegation, and observability.

**What's different:** live playground UI showing agents as nodes, delegation edges, and message flow (not just final output).

**Try it:**
\`\`\`bash
git clone https://github.com/naaa-G/OACP.git
cd OACP && pnpm install && pnpm build
pnpm oacp run "build todo app"
\`\`\`

Stack: TypeScript monorepo, JSON Schema protocol, HTTP server, TS + Python SDKs, LangChain/AutoGen adapters.

Alpha — looking for feedback on protocol and developer experience. Apache 2.0.

Repo: https://github.com/naaa-G/OACP
Docs: https://naaa-g.github.io/OACP/quick-start
```

### r/LocalLLaMA

**Title:** OACP – run a multi-agent "startup team" locally and watch them collaborate in a web playground

Focus on: local-first, no cloud required, `oacp run` one-liner, visible agent graph.

Link: https://github.com/naaa-G/OACP

## X (Twitter) thread

**Tweet 1:**

> We open-sourced OACP — multi-agent task execution you can _see_ working live.
>
> One command. PM + Backend + Frontend + QA agents. Full trace in the browser.
>
> 🧵 https://github.com/naaa-G/OACP

**Tweet 2:**

> \`\`\`bash
> pnpm oacp run "build todo app" --keep-alive
> \`\`\`
>
> Opens a playground with agent nodes, delegation graph, and message timeline.

**Tweet 3:**

> Protocol-first (JSON Schema v0.1), not a LangChain wrapper.
> Interoperates with MCP/A2A — coordinates agents, doesn't replace tool protocols.

**Tweet 4:**

> Alpha, Apache 2.0. Star ⭐ if live multi-agent visibility is your missing piece.
>
> https://github.com/naaa-G/OACP
> Docs: https://naaa-g.github.io/OACP

## FAQ — launch day replies

| Question              | Answer                                                                             |
| --------------------- | ---------------------------------------------------------------------------------- |
| vs LangChain?         | OACP coordinates agents over a network; LangChain adapter included. Complementary. |
| vs MCP?               | MCP connects models to tools; OACP connects agents to each other.                  |
| Production ready?     | No — alpha v0.1. Pin versions, expect breaking changes.                            |
| Why another protocol? | DX + live visualization + open reference implementation.                           |
| License?              | Apache 2.0                                                                         |

## Post-launch (week 1)

See [Post-launch runbook](./post-launch.md) for the full checklist. Summary:

- [ ] Monitor GitHub Issues — triage within 48h
- [ ] Apply `good first issue` labels where appropriate
- [ ] Respond to HN/Reddit threads for 48h
- [ ] Enable GitHub Discussions categories (Q&A, Ideas, Show and tell)
- [ ] Collect feedback into Discussions
- [ ] Schedule v0.1.1 patch for critical bugs only

## Related

- [Launch kit](./launch-kit.md)
- [Post-launch runbook](./post-launch.md)
- [Community & support](./community.md)
- [Release v0.1.0-alpha](./releases/v0.1.0-alpha.md)
- [Demo video script](./demo-video-script.md)
- [Screenshots](./screenshots.md)
