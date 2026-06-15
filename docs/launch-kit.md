# Launch kit (Day 29)

Everything you need to **demo, record, and publish** OACP. Use this before Day 30 public launch.

## Assets

| Asset                | Path                                                     | Use                              |
| -------------------- | -------------------------------------------------------- | -------------------------------- |
| Architecture diagram | [`/architecture-diagram.svg`](/architecture-diagram.svg) | README, slides, blog posts       |
| Demo video script    | [Demo video script](./demo-video-script.md)              | Record a 3–5 minute walkthrough  |
| Screenshot guide     | [Screenshots](./screenshots.md)                          | Capture playground & CLI visuals |
| Launch day playbook  | [Launch day (Day 30)](./launch-day.md)                   | HN, Reddit, X, GitHub release    |

## Pre-launch checklist

Run before tagging `v0.1.0-alpha` or opening the repo publicly:

- [ ] `pnpm verify` passes locally and in CI
- [ ] `pnpm docs:build` succeeds
- [x] GitHub repository set to [`naaa-G/OACP`](https://github.com/naaa-G/OACP) (see `docs/.vitepress/repo.mjs`)
- [x] `SECURITY.md` uses [GitHub Security Advisories](https://github.com/naaa-G/OACP/security/advisories/new)
- [x] Issue & PR templates in `.github/` (Day 30)
- [x] Release notes at `.github/RELEASE_v0.1.0-alpha.md`
- [ ] Capture screenshots per [screenshots.md](./screenshots.md) _(optional but recommended)_
- [ ] Record demo video using [demo-video-script.md](./demo-video-script.md) _(optional)_
- [x] Review [launch-day.md](./launch-day.md) copy templates
- [ ] Execute [Launch day (Day 30)](./launch-day.md) — public repo, release, social posts
- [ ] Follow [post-launch.md](./post-launch.md) week 1 runbook after publish

## Elevator pitch (use everywhere)

> **OACP** is an open multi-agent collaboration protocol with a live playground — run `oacp run "build todo app"` and watch PM, Backend, Frontend, and QA agents delegate tasks, build a repo scaffold, and show the full trace in your browser.

### One-liner

Multi-agent task execution you can **see working live**.

### Category (be consistent)

**Multi-agent task execution & collaboration layer** — interoperates with MCP/A2A; does not replace them.

## 5-minute demo path (for evaluators)

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP && pnpm install && pnpm build
pnpm oacp run "build todo app" --keep-alive
# Open the printed playground URL
```

What they should see:

1. Terminal JSON output with `repo_structure`, `qa_status: approved`, `trace_id`
2. Playground with agent nodes lighting up
3. Delegation graph edges forming
4. Message timeline updating

## Key differentiator (lead with this)

MetaGPT and ChatDev showed agents building software. **OACP shows it happening live** — agents as nodes, messages flowing, delegations graphed in real time.

## Documentation map for newcomers

| Audience             | Start here                        |
| -------------------- | --------------------------------- |
| Curious visitor      | [What is OACP?](/what-is-oacp)    |
| Developer trying it  | [Quick start](/quick-start)       |
| Contributor          | [Development guide](/development) |
| Framework integrator | [Integrations](/integrations)     |

## Architecture reference

![OACP architecture diagram](/architecture-diagram.svg)

Layer details: [Architecture](/architecture).

## Support channels

| Channel                                                                       | Purpose                |
| ----------------------------------------------------------------------------- | ---------------------- |
| [GitHub Issues](https://github.com/naaa-G/OACP/issues)                        | Bugs, feature requests |
| [GitHub Discussions](https://github.com/naaa-G/OACP/discussions)              | Q&A, show-and-tell     |
| [Security advisories](https://github.com/naaa-G/OACP/security/advisories/new) | Responsible disclosure |

Details: [Community & support](./community.md).

## Related

- [Demo video script](./demo-video-script.md)
- [Screenshots](./screenshots.md)
- [Launch day playbook](./launch-day.md)
- [Post-launch runbook](./post-launch.md)
- [Community & support](./community.md)
- [Startup team demo](./startup-team.md)
- [Playground](./playground.md)
