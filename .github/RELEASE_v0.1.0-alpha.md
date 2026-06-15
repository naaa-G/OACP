## OACP — Open Agent Collaboration Protocol

**v0.1.0-alpha** is the first public release of OACP: a protocol + reference stack for multi-agent task execution with a **live playground** you can open in the browser.

### Try it (5 minutes)

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP && pnpm install && pnpm build
pnpm oacp run "build todo app" --keep-alive
```

Open the printed `playground_url`. You should see PM, Designer, Backend, Frontend, and QA agents collaborate and deliver a repo scaffold with full trace visibility.

### Highlights

- **Protocol-first** — JSON Schema messages (`v0.1`), agent identity, capabilities, validation
- **Reference HTTP server** — registry, capability routing, retries, delegation graph, memory API
- **Live playground** — agents as nodes, message timeline, delegation topology, trace deep links
- **DAG workflows** — subtask decomposition, failure recovery, observability / trace viewer
- **SDKs** — TypeScript (`@oacp/sdk`) and Python (`oacp-sdk`) HTTP clients
- **CLI** — `oacp run`, `oacp trace`, `oacp serve`
- **Integrations** — LangChain (`@oacp/integration-langchain`) and AutoGen (`oacp-autogen`) adapters
- **Example gallery** — coding, research, and bug-finder swarms

### Documentation

- [Quick start](https://naaa-g.github.io/OACP/quick-start)
- [What is OACP?](https://naaa-g.github.io/OACP/what-is-oacp)
- [Architecture diagram](https://naaa-g.github.io/OACP/architecture-diagram.svg)
- [Community & support](https://naaa-g.github.io/OACP/community)

### Status

Early **alpha**. APIs and schemas may change. Not production-ready. Apache 2.0.

### Feedback

- [GitHub Issues](https://github.com/naaa-G/OACP/issues) — bugs and feature requests
- [GitHub Discussions](https://github.com/naaa-G/OACP/discussions) — questions and show-and-tell
- Security: [private advisories](https://github.com/naaa-G/OACP/security/advisories/new) only

**Full changelog:** [CHANGELOG.md](https://github.com/naaa-G/OACP/blob/main/CHANGELOG.md)
