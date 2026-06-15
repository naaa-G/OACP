# Example gallery (Day 25)

Three runnable multi-agent swarms that showcase different OACP collaboration patterns. Each swarm runs over HTTP with DAG workflows, shared memory, delegation graphs, and playground visualization.

## Quick start

```bash
pnpm build

# Coding — plan → implement → review → test → deliver
pnpm --filter oacp-examples start:coding-swarm

# Research — gather → parallel enrichment → brief
pnpm --filter oacp-examples start:research-swarm

# Bug finder — scan → triage → reproduce (with failover) → fix
pnpm --filter oacp-examples start:bug-finder-swarm
```

CI smoke (all three):

```bash
pnpm --filter oacp-examples start:coding-swarm -- --verify
pnpm --filter oacp-examples start:research-swarm -- --verify
pnpm --filter oacp-examples start:bug-finder-swarm -- --verify
pnpm --filter oacp-examples start:bug-finder-swarm -- --verify-recovery
```

---

## Coding swarm

**Use case:** A team ships a focused code change with review and test gates.

```
Remote coordinator
       │
       ▼
  OACP server
       │
  Planner → Implementer → Reviewer → Tester → Deliverer
```

| Agent       | Capability       | Role                              |
| ----------- | ---------------- | --------------------------------- |
| Planner     | `code.plan`      | Breaks module + task into steps   |
| Implementer | `code.implement` | Produces file list and diff stats |
| Reviewer    | `code.review`    | Approves or requests changes      |
| Tester      | `code.test`      | Runs tests, gates delivery        |
| Deliverer   | `code.deliver`   | Emits merge-ready summary         |

**Default input:** `{ module: "auth-service", task: "rate limiting middleware" }`

**Path:** [Coding swarm](https://github.com/naaa-G/OACP/tree/main/examples/gallery/coding-swarm)

---

## Research swarm

**Use case:** Parallel enrichment before synthesis — same DAG pattern as Demo v2, applied to research briefs.

```
Gatherer → (Keyword extractor ∥ Source ranker) → Analyzer → Synthesizer → Publisher
```

| Agent             | Capability            | Role                             |
| ----------------- | --------------------- | -------------------------------- |
| Gatherer          | `research.gather`     | Collects raw sources for a topic |
| Keyword extractor | `research.keywords`   | Parallel signal extraction       |
| Source ranker     | `research.rank`       | Scores sources by relevance      |
| Analyzer          | `research.analyze`    | Derives key findings             |
| Synthesizer       | `research.synthesize` | Writes executive summary         |
| Publisher         | `research.publish`    | Final brief with citations       |

**Default input:** `{ topic: "WebAssembly for edge compute" }`

**Path:** [Research swarm](https://github.com/naaa-G/OACP/tree/main/examples/gallery/research-swarm)

---

## Bug-finder swarm

**Use case:** Incident-style log triage with **resilient reproduce** (primary/backup agents, Day 19 recovery).

```
Scanner → Triager → (Reproduce ∥ Analyze) → Fixer → Verifier
```

| Agent             | Capability      | Role                               |
| ----------------- | --------------- | ---------------------------------- |
| Scanner           | `bug.scan`      | Parses log excerpt, assigns bug id |
| Triager           | `bug.triage`    | Severity + component               |
| Reproduce primary | `bug.reproduce` | First repro attempt (may fail)     |
| Reproduce backup  | `bug.reproduce` | Failover sandbox                   |
| Analyzer          | `bug.analyze`   | Root cause hypothesis              |
| Fixer             | `bug.fix`       | Patch proposal                     |
| Verifier          | `bug.verify`    | Confirms reproduction + fix plan   |

Set `OACP_BUG_FINDER_SIMULATE_FAILURE=1` or pass `--verify-recovery` to exercise failover.

**Default input:** `{ repo: "payment-api", log_excerpt: "NullReferenceException … line 42" }`

**Path:** [Bug-finder swarm](https://github.com/naaa-G/OACP/tree/main/examples/gallery/bug-finder-swarm)

---

## Shared architecture

All gallery swarms use:

| Layer              | Package / path                            |
| ------------------ | ----------------------------------------- |
| HTTP server        | `@oacp/server` `createApp()`              |
| Workflow DAG       | `@oacp/core` `WorkflowEngine`             |
| Remote coordinator | `@oacp/sdk` `AgentClient.runWorkflow()`   |
| Memory + graph     | `taskRecorder`, `delegationGraphRecorder` |
| Observability      | Trace timeline + playground deep links    |
| Bootstrap helper   | `examples/gallery/shared/`                |

```text
examples/gallery/
├── shared/
│   ├── gallery-bootstrap.ts   # wire workers + workflow
│   └── run-gallery-demo.ts    # shared runner (--verify, traces)
├── coding-swarm/
├── research-swarm/
└── bug-finder-swarm/
```

---

## Playground

After any swarm run, open the printed playground URL or start a server and inspect traces:

```bash
pnpm oacp trace --list          # requires oacp serve or --keep-alive
pnpm oacp serve --bootstrap startup
```

---

## Related

- [Startup team](./startup-team.md) — flagship product-building demo (Day 23)
- [Demo v2](./demo-v2.md) — parallel enrichment + recovery (Day 21)
- [Workflow engine](./workflow-engine.md)
- [Failure recovery](./failure-recovery.md)
