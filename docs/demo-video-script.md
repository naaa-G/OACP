# Demo video script

**Target length:** 3–5 minutes  
**Title:** _Watch AI agents build an app live with OACP_  
**Audience:** Developers evaluating multi-agent frameworks  
**Recording tip:** Capture terminal + browser side-by-side; dark theme matches the playground.

---

## Scene 1 — Hook (0:00 – 0:25)

**Visual:** Playground with agents lighting up, delegation graph animating.

**Voiceover:**

> Most multi-agent demos show you a log file at the end. OACP lets you **watch** agents collaborate in real time — who delegated what, which capability ran, and the full message trace.
>
> In the next few minutes I'll run one command and we'll watch PM, Backend, Frontend, and QA agents build a todo app together.

---

## Scene 2 — What OACP is (0:25 – 0:55)

**Visual:** Architecture diagram (`/architecture-diagram.svg`) or docs site.

**Voiceover:**

> OACP is an open **multi-agent collaboration protocol** — not a replacement for MCP or LangChain, but a layer on top for task routing, delegation graphs, and observability.
>
> It ships with a reference server, TypeScript and Python SDKs, a CLI, and this playground.

**On-screen text:** `Protocol · SDK · Server · Playground`

---

## Scene 3 — Install (0:55 – 1:20)

**Visual:** Terminal.

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
pnpm install && pnpm build
```

**Voiceover:**

> Clone the repo, install with pnpm, and build. Node 20+ and pnpm 9 — that's it for the demo.

---

## Scene 4 — The one command (1:20 – 2:30)

**Visual:** Terminal running CLI; split to playground as output appears.

```bash
pnpm oacp run "build todo app" --keep-alive
```

**Voiceover:**

> One command: `oacp run "build todo app"`. OACP boots a server, registers the Autonomous Startup Team, and runs the `autonomous-startup-v1` workflow.
>
> Watch the output — project slug, repo file list, QA approval, and a trace ID with a playground link.

**Highlight on screen:**

- `repo_structure` array growing
- `qa_status: "approved"`
- `playground_url`

**Voiceover (continued):**

> Open the playground URL. Each agent is a node. Edges show delegations. The timeline shows every message in the trace.

---

## Scene 5 — Playground tour (2:30 – 3:30)

**Visual:** Playground UI — pan through three panels.

1. **Agent registry** — PM, Designer, Backend, Frontend, QA capabilities
2. **Delegation graph** — DAG edges between agents
3. **Message flow** — task_request / task_response timeline

**Voiceover:**

> This is the differentiator. You're not guessing what happened — you see the collaboration topology and message flow as it occurred.
>
> Deep-link any trace with `?trace_id=` from CLI or API output.

---

## Scene 6 — Under the hood (3:30 – 4:15)

**Visual:** Quick code flash or docs — optional.

**Voiceover:**

> Under the hood: JSON Schema messages, capability-based routing, retries, shared memory, and a DAG workflow engine. Integrate from TypeScript, Python, LangChain, or AutoGen.
>
> Everything is Apache 2.0 and alpha — we're looking for contributors and feedback.

**On-screen text:**

- `@oacp/sdk` · `oacp-sdk`
- `@oacp/integration-langchain` · `oacp-autogen`

---

## Scene 7 — Call to action (4:15 – 4:45)

**Visual:** GitHub repo page + star button.

**Voiceover:**

> Try it yourself — links in the description. Star the repo if multi-agent collaboration with live visibility is your kind of problem.
>
> Issues and PRs welcome. Thanks for watching.

**End card text:**

```
github.com/naaa-G/OACP
pnpm oacp run "build todo app"
```

---

## B-roll shots (optional)

| Shot              | Command                                                |
| ----------------- | ------------------------------------------------------ |
| Example gallery   | `pnpm --filter oacp-examples start:coding-swarm`       |
| Trace CLI         | `pnpm oacp trace --list`                               |
| Docs site         | `pnpm docs:dev`                                        |
| LangChain adapter | `pnpm --filter oacp-examples start:langchain-delegate` |

---

## Recording checklist

- [ ] Terminal font ≥ 14pt, high contrast
- [ ] Browser zoom 100%, playground fully visible
- [ ] Run demo once before recording (warm server optional)
- [ ] Use `--keep-alive` so playground stays available
- [ ] Export 1080p; upload with chapters at Scene 4 and Scene 5

See [screenshots.md](./screenshots.md) for still captures from the same session.
