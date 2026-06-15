<div align="center">

# OACP — Open Agent Collaboration Protocol

**A multi-agent task-execution system you can watch working live.**

OACP gives autonomous AI agents a common way to discover each other, exchange tasks,
delegate work, and collaborate — with a **live visual playground** so you can _see_ the
collaboration happen, not just read it in logs.

[![Status: Alpha](https://img.shields.io/badge/status-alpha-orange.svg)](#-project-status)
[![GitHub](https://img.shields.io/badge/GitHub-naaa--G%2FOACP-181717?logo=github)](https://github.com/naaa-G/OACP)
[![Release](https://img.shields.io/badge/release-v0.1.0--alpha-blue.svg)](https://github.com/naaa-G/OACP/releases/tag/v0.1.0-alpha)
[![Spec Version](https://img.shields.io/badge/protocol-v0.1-blue.svg)](./specs)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/built%20with-TypeScript-3178c6.svg)](https://www.typescriptlang.org/)

[Quick Start](#-quick-start) · [Docs](https://naaa-g.github.io/OACP) · [Launch kit](./docs/launch-kit.md) · [Architecture](#-architecture) · [Examples](#-examples) · [Roadmap](#-roadmap) · [Contributing](./CONTRIBUTING.md)

</div>

---

## 📋 Table of Contents

- [Why OACP?](#-why-oacp)
- [Project Status](#-project-status)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Launch kit](#-launch-kit)
- [Core Concepts](#-core-concepts)
- [Architecture](#-architecture)
- [The Protocol](#-the-protocol)
- [SDKs](#-sdks)
- [Examples](#-examples)
- [The Playground](#-the-playground)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [Comparison & Interoperability](#-comparison--interoperability)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)

---

## 🤔 Why OACP?

Building one capable agent is increasingly easy. Getting **several agents to reliably work
together** is not. Today that means brittle glue code, invisible message passing, and no
shared notion of identity, capability, or delivery guarantees.

OACP standardizes the boring-but-critical parts of multi-agent collaboration:

- **A common message format** — `task_request`, `task_response`, `delegation`, `capability_query`, and more.
- **Agent identity & capabilities** — every agent declares who it is and what it can do.
- **Capability-based routing** — "find an agent that can debug code" routes automatically.
- **Delivery guarantees** — retries, timeouts, and fallback routing built in.
- **Shared memory & delegation graphs** — agents remember decisions and track who did what.
- **A live playground** — visualize agents as nodes and watch messages and delegations flow in real time.

> **Positioning:** OACP is a _collaboration & orchestration layer_, not a replacement for
> model or tool protocols. It's designed to **interoperate** with emerging standards (e.g.
> MCP, A2A) rather than compete with them. See [Comparison & Interoperability](#-comparison--interoperability).

---

## 🚧 Project Status

> **OACP v0.1.0-alpha is publicly available** at [github.com/naaa-G/OACP](https://github.com/naaa-G/OACP).
> The protocol surface, APIs, and schemas are **unstable and may change**. Suitable for
> experimentation and contribution, **not production**. Pin exact versions and expect breaking
> changes until `v1.0`. Docs: [naaa-g.github.io/OACP](https://naaa-g.github.io/OACP).

---

## ✨ Features

| Area                | Capability                                                |     Status     |
| ------------------- | --------------------------------------------------------- | :------------: |
| **Monorepo**        | pnpm + Turborepo, strict TypeScript, ESLint, Prettier, CI |    🟢 Done     |
| **Protocol**        | Versioned JSON-Schema message types (`v0.1`)              | 🟢 Day 2 done  |
| **Schema registry** | Load bundled schemas via `@oacp/core`                     |    🟢 Done     |
| **Identity**        | Agent identity model with public keys & capabilities      | 🟢 Day 3 done  |
| **Validation**      | Message validator (JSON Schema + type + version `0.1`)    | 🟢 Day 4 done  |
| **Routing**         | In-memory message bus + capability-based routing          | 🟢 Day 5 done  |
| **Runtime**         | `Agent.sendTask()` / `receiveTask()` / `respond()`        | 🟢 Day 6 done  |
| **Integration**     | Multi-agent E2E tests (Agent A → Agent B in one process)  | 🟢 Day 7 done  |
| **Networking**      | HTTP server + remote SDK + network demo (A→B→C)           | 🟢 Day 14 done |
| **Reliability**     | Retries, timeouts, at-least-once HTTP delivery            | 🟢 Day 12 done |
| **Memory**          | Shared task history (SQLite/Postgres + HTTP API)          | 🟢 Day 15 done |
| **Orchestration**   | DAG workflow engine                                       |    ✅ Done     |
| **Playground**      | Live web visualization of agents & messages               | 🟢 Day 22 done |
| **SDKs**            | TypeScript + Python HTTP clients                          | 🟢 Day 27 done |
| **Adapters**        | LangChain + AutoGen integration bridges                   | 🟢 Day 28 done |

Legend: 🟢 stable · 🟡 in progress · ⚪ planned

---

## ⚡ Quick Start

**Under 5 minutes** — clone, build, run the Autonomous Startup Team, open the playground:

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
pnpm install && pnpm build
pnpm oacp run "build todo app" --keep-alive
```

Open the `playground_url` printed in the output. You will see PM, Designer, Backend, Frontend,
and QA agents collaborate and deliver a repo scaffold with full trace visibility.

| Output                | Meaning                                  |
| --------------------- | ---------------------------------------- |
| `repo_structure`      | Generated project files                  |
| `qa_status: approved` | QA agent sign-off                        |
| `trace_id`            | Correlation ID for traces and playground |
| `playground_url`      | Live agent graph + message timeline      |

More paths: [`docs/quick-start.md`](./docs/quick-start.md) · [`docs/startup-team.md`](./docs/startup-team.md)

---

## 🚀 Developer setup

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
pnpm install
pnpm verify    # format · lint · typecheck · test · build
```

Or use the setup script:

```bash
./scripts/setup.sh
```

Verify the SDK is wired:

```ts
import { PROTOCOL_VERSION, SDK_VERSION } from '@oacp/sdk';

console.log(PROTOCOL_VERSION); // "0.1"
console.log(SDK_VERSION); // "0.1.0"
```

Full developer guide: [`docs/development.md`](./docs/development.md).

### Demo v1 — agents over the network (Week 2 — Day 14)

Run the Week 2 capstone: a remote coordinator drives three server-side agents over HTTP:

```bash
pnpm build
pnpm --filter oacp-examples start:demo
```

You get structured output, capability discovery, and a full message timeline with one shared
`trace_id`. Walkthrough: [`docs/demo-v1.md`](./docs/demo-v1.md).

### Demo v2 — structured task chain (Week 3 — Day 21)

Run the Week 3 capstone: a remote coordinator triggers a DAG workflow with memory, recovery,
and trace observability:

```bash
pnpm build
pnpm --filter oacp-examples start:demo-v2
```

Walkthrough: [`docs/demo-v2.md`](./docs/demo-v2.md).

### Autonomous Startup Team — flagship demo (Week 4 — Day 23)

Watch PM, Designer, Backend, Frontend, and QA agents collaborate on a product prompt and
deliver a repo scaffold — best viewed in the playground:

```bash
pnpm build
pnpm --filter oacp-examples start:startup
pnpm --filter oacp-examples start:playground -- --loop
```

Walkthrough: [`docs/startup-team.md`](./docs/startup-team.md).

### OACP CLI (Week 4 — Day 24)

Run agent teams from the terminal:

```bash
pnpm build
pnpm oacp run "build todo app"
pnpm oacp run "build habit tracker" --format json
pnpm oacp serve --bootstrap startup
```

Guide: [`docs/cli.md`](./docs/cli.md).

### Example gallery (Week 4 — Day 25)

Three swarms showcasing different collaboration patterns:

```bash
pnpm build
pnpm --filter oacp-examples start:coding-swarm
pnpm --filter oacp-examples start:research-swarm
pnpm --filter oacp-examples start:bug-finder-swarm
```

Guide: [`docs/examples-gallery.md`](./docs/examples-gallery.md).

### Documentation site (Week 4 — Day 26)

Browse the full docs site locally:

```bash
pnpm install
pnpm docs:dev
# Open http://localhost:5173
```

Build for production: `pnpm docs:build`. See [`docs/development.md`](./docs/development.md#documentation-website-day-26).

### Hello, Agents (Week 1 — verified Day 7)

Create two agents in one process and have one delegate a task to the other:

```ts
import { Agent, LocalBus } from '@oacp/sdk';

const bus = new LocalBus();

const summarizer = new Agent({
  name: 'summarizer',
  capabilities: ['text.summarize'],
  bus,
  onTask: async (task) => ({
    output: `Summary of: ${task.input.text.slice(0, 40)}...`,
  }),
});

const coordinator = new Agent({
  name: 'coordinator',
  capabilities: ['orchestrate'],
  bus,
});

await Promise.all([summarizer.start(), coordinator.start()]);

const result = await coordinator.sendTask({
  capability: 'text.summarize',
  input: { text: 'OACP lets agents collaborate over a shared protocol...' },
});

console.log(result.output);
```

### Run a demo from the CLI (Week 4)

```bash
oacp run "build a habit tracker app"
```

## 📣 Launch kit & community

**Public launch (Day 30):** release `v0.1.0-alpha`, playbook, and community tooling are ready.

| Resource                                                | Purpose                                |
| ------------------------------------------------------- | -------------------------------------- |
| [Launch day playbook](./docs/launch-day.md)             | GitHub release, HN, Reddit, X copy     |
| [Post-launch runbook](./docs/post-launch.md)            | Week 1 triage and metrics              |
| [Community & support](./docs/community.md)              | Issues, Discussions, security          |
| [Launch kit](./docs/launch-kit.md)                      | Demo assets, elevator pitch, checklist |
| [Release v0.1.0-alpha](./docs/releases/v0.1.0-alpha.md) | What's in the first public release     |

Tag a release: `.\scripts\tag-release.ps1` (Windows) or `./scripts/tag-release.sh`

Capture helper: `.\scripts\capture-launch-assets.ps1` or `./scripts/capture-launch-assets.sh`

---

## 🧠 Core Concepts

| Concept              | Description                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Agent**            | An addressable participant with an `id`, `name`, declared `capabilities[]`, and a `publicKey` for identity.  |
| **Capability**       | A named skill (e.g. `code.debug`, `text.summarize`) used for discovery and routing.                          |
| **Message**          | A typed, schema-validated envelope (`task_request`, `task_response`, `delegation`, …) carrying a `trace_id`. |
| **Message Bus**      | The transport that delivers messages — local (in-memory) or networked (HTTP).                                |
| **Registry**         | A discovery service mapping capabilities → agents.                                                           |
| **Delegation Graph** | A record of who delegated what to whom, enabling traceability and recovery.                                  |
| **Memory**           | Shared, scoped storage of task history, decisions, and outputs.                                              |
| **Orchestrator**     | A workflow engine that decomposes tasks and executes them as a DAG.                                          |

---

## 🏗 Architecture

![OACP architecture diagram](./docs/public/architecture-diagram.svg)

<details>
<summary>Text diagram (fallback)</summary>

```text
┌──────────────────────────────────────────────────────────────┐
│                         Playground (Web)                       │
│        live agent graph · message flow · delegation view       │
└───────────────────────────────┬──────────────────────────────┘
                                 │ observes
┌───────────────────────────────▼──────────────────────────────┐
│                       OACP Server (node)                       │
│   HTTP/gRPC API · Registry · Orchestrator · Storage adapters   │
└───────────────────────────────┬──────────────────────────────┘
                                 │ uses
┌───────────────────────────────▼──────────────────────────────┐
│                            Core Engine                         │
│  Protocol (validate/version) · Routing (bus/retry) ·           │
│  Security (auth/signatures) · Runtime (lifecycle) · Memory     │
└───────────────────────────────┬──────────────────────────────┘
                                 │ governed by
┌───────────────────────────────▼──────────────────────────────┐
│              Specs  (JSON Schemas — source of truth)           │
│   messages/ · agent/ · registry/                               │
└────────────────────────────────────────────────────────────────┘
        ▲                                              ▲
        │                                              │
   SDKs (TS/Py/Rust)                          Integrations (LangChain,
   used by your agents                        AutoGen, CrewAI, …)
```

</details>

See [`docs/architecture.md`](./docs/architecture.md) for the full breakdown.

---

## 📜 The Protocol

The protocol is the product. All message types are defined as JSON Schemas under
[`specs/`](./specs) and are the **single source of truth** — SDKs and servers validate
against them.

### Core message types (`v0.1`)

| Message            | Purpose                                                |
| ------------------ | ------------------------------------------------------ |
| `task_request`     | Ask an agent (or capability) to perform work.          |
| `task_response`    | Return the result (or error) of a task.                |
| `delegation`       | Hand a (sub)task to another agent and track the chain. |
| `capability_query` | Discover agents that can perform a capability.         |
| `memory_share`     | Share scoped context/decisions between agents.         |
| `heartbeat`        | Liveness + health signaling.                           |

### Example: `task_request`

```json
{
  "type": "task_request",
  "version": "0.1",
  "trace_id": "0c8f1e2a-...-9b",
  "from": "agent://coordinator",
  "capability": "text.summarize",
  "input": { "text": "..." },
  "deadline_ms": 30000
}
```

> Versioning is explicit (`version` field) so the protocol can evolve without silently
> breaking agents. See [`docs/message-types.md`](./docs/message-types.md).

---

## 📦 SDKs

| Language   | Package        |       Status        |
| ---------- | -------------- | :-----------------: |
| TypeScript | `@oacp/sdk`    | 🟢 Primary (Day 27) |
| Python     | `oacp-sdk`     | 🟢 Minimal (Day 27) |
| Rust       | `oacp` (crate) |     ⚪ Planned      |

```bash
# TypeScript — full SDK or remote-only subpath
pnpm add @oacp/sdk
import { createAgentClient } from '@oacp/sdk/client';

# Python — async HTTP client
pip install -e "sdk/python[dev]"
```

Guides: [`docs/sdk-typescript.md`](./docs/sdk-typescript.md) · [`docs/sdk-python.md`](./docs/sdk-python.md) · [`docs/integrations.md`](./docs/integrations.md)

The TypeScript SDK is the reference implementation; Python mirrors `AgentClient` for
remote orchestration from non-Node runtimes.

---

## 💡 Examples

Runnable examples live in [`examples/`](./examples):

| Command / path                                            | What it shows                                   |
| --------------------------------------------------------- | ----------------------------------------------- |
| `pnpm oacp run "build todo app"`                          | **CLI** — startup team from terminal (Day 24)   |
| `pnpm --filter oacp-examples start:coding-swarm`          | **Gallery** — coding swarm pipeline (Day 25)    |
| `pnpm --filter oacp-examples start:research-swarm`        | **Gallery** — research brief DAG (Day 25)       |
| `pnpm --filter oacp-examples start:bug-finder-swarm`      | **Gallery** — bug triage + recovery (Day 25)    |
| `pnpm --filter oacp-examples start:startup`               | **Flagship** — Autonomous Startup Team (Day 23) |
| `pnpm --filter oacp-examples start:playground`            | **Playground** — live graph + startup team demo |
| `pnpm --filter oacp-examples start:demo-v2`               | **Demo v2** — incident-response DAG (Week 3)    |
| `pnpm --filter oacp-examples start:demo`                  | **Demo v1** — 3 agents over HTTP (Week 2)       |
| [`multi-agent/hello-agents.ts`](./examples/multi-agent)   | In-process Agent A → Agent B (Week 1)           |
| [`remote-agent/hello-remote.ts`](./examples/remote-agent) | Remote coordinator → single worker (Day 9)      |
| [`pipeline/agent-chain.ts`](./examples/pipeline)          | Local A → B → C pipeline (Day 13)               |
| `pnpm --filter oacp-examples start:sdk-remote`            | **SDK** — remote client + dev registration      |
| `pnpm --filter oacp-examples start:sdk-workflow`          | **SDK** — run startup workflow via HTTP         |
| `pnpm --filter oacp-examples start:langchain-delegate`    | **Adapter** — LangChain tool → OACP (Day 28)    |

SDK guide: [`examples/sdk/README.md`](./examples/sdk/README.md). Integrations: [`docs/integrations.md`](./docs/integrations.md). Gallery guide: [`docs/examples-gallery.md`](./docs/examples-gallery.md).

---

## 🎮 The Playground

The playground is OACP's signature experience: a web app that renders agents as nodes and
animates messages and task delegations **as they happen**.

```bash
pnpm build
pnpm --filter oacp-examples start:playground -- --loop
# → http://127.0.0.1:3000/playground (Autonomous Startup Team workload)
```

Features:

- **Registered agents** with capabilities, highlighted when active in a trace
- **Delegation graph** — agent topology with subtask/delegation edges
- **Live message flow** — timeline feed with configurable polling
- **Deep links** — `?trace_id=<uuid>` from demo or CLI output

Full guide: [`docs/playground.md`](./docs/playground.md).

Flagship demo (Day 23) — **Autonomous Startup Team**:

1. You type a prompt: _"Build a habit tracker app."_
2. OACP spawns **PM**, **Backend**, **Frontend**, and **Tester** agents.
3. They discuss, delegate, and produce a working project structure.
4. You watch the entire collaboration unfold live.

---

## 🗂 Project Structure

A high-level view of the monorepo:

```text
oacp/
├── specs/         # ★ Protocol JSON Schemas (source of truth)
├── core/          # ★ Engine: protocol, routing, security, runtime, memory
├── sdk/           # ★ Client SDKs (TypeScript first)
├── server/        # Reference network node (API, registry, orchestration)
├── playground/    # ★ Live visualization + flagship demos
├── examples/      # Copy-paste runnable use cases
├── tools/         # CLI, scaffolding generators, trace/debug tooling
├── integrations/  # LangChain, LlamaIndex, AutoGen, CrewAI adapters
├── benchmarks/    # Latency / throughput / coordination metrics
└── docs/          # Architecture, spec, security, lifecycle, examples
```

---

## 🗺 Roadmap

### v0.1.0-alpha — shipped ✅

| Milestone | Theme                  | Outcome                                           | Status  |
| --------- | ---------------------- | ------------------------------------------------- | :-----: |
| **M0**    | Repository bootstrap   | Monorepo, tooling, CI, docs                       | ✅ Done |
| **M1**    | Protocol Core          | Schemas + validation + minimal in-process runtime | ✅ Done |
| **M2**    | Networking             | Agents collaborate over HTTP with a registry      | ✅ Done |
| **M3**    | Collaboration & Memory | Shared memory, delegation graphs, DAG workflows | ✅ Done |
| **M4**    | Adoption               | Playground, CLI, docs site, launch                | ✅ Done |

### v0.2.0-alpha — in progress (trust, polish & adoption)

**Target:** production-adjacent alpha — flawless flagship demo, deployable stack, trust layer for internal evaluation.

| Milestone | Theme                    | Outcome                                           | Status     |
| --------- | ------------------------ | ------------------------------------------------- | :--------: |
| **M5**    | Launch & flagship polish | Public release, demo video, cold-run verification | ⚪ Planned |
| **M6**    | Demo & DX                | Under-5-min quick start, hosted demo, CI smoke    | ⚪ Planned |
| **M7**    | Trust & deployability    | Message signing, server auth, Docker Compose      | ⚪ Planned |
| **M8**    | Stability & observability| API policy, OpenTelemetry, persistent registry    | ⚪ Planned |

**M5 focus:** tag `v0.1.0-alpha`, enable GitHub Pages, record the Autonomous Startup Team demo, and verify `pnpm oacp run "build todo app" --keep-alive` works on a fresh clone before Show HN / Reddit outreach.

**M7–M8 focus:** teams can run OACP on a private network with signing, Docker, and clearer semver — still **not** production until `v1.0`.

Runbooks: [`docs/post-launch.md`](./docs/post-launch.md) · [`docs/launch-day.md`](./docs/launch-day.md) · [`docs/security-model.md`](./docs/security-model.md)

---

## 🔗 Comparison & Interoperability

OACP focuses on **agent-to-agent collaboration and orchestration**, and aims to play well
with the broader ecosystem rather than replace it.

| Standard                         | Focus                           | Relationship to OACP                                                   |
| -------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| **MCP** (Model Context Protocol) | Connecting models to tools/data | Complementary — agents can use MCP tools; OACP coordinates the agents. |
| **A2A** (Agent2Agent)            | Agent-to-agent messaging        | Overlapping — OACP aims to interoperate / bridge rather than compete.  |
| **LangChain / AutoGen / CrewAI** | Agent frameworks                | Adapters let framework agents join an OACP network.                    |

> **Honest note:** the agent-protocol space is crowded and backed by large organizations.
> OACP's bet is **developer experience + live visualization + interoperability**, not
> "becoming the one true standard."

---

## 🤝 Contributing

Contributions are welcome! Please read:

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — dev setup, branch/PR conventions, commit style.
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — community expectations.

```bash
pnpm install      # install workspace deps
pnpm verify       # full quality gate (recommended before PRs)
pnpm dev          # watch mode for packages
pnpm test         # run the test suite
pnpm lint         # ESLint
pnpm format       # Prettier
```

See [`docs/development.md`](./docs/development.md) for the full guide.

Good first contributions: new examples, schema edge cases, docs, and playground polish.

---

## 🔒 Security

Do **not** open public issues for vulnerabilities. Follow the responsible-disclosure
process in [`SECURITY.md`](./SECURITY.md). OACP's security model (identity, signatures,
permissions, sandboxing) is documented in [`docs/security-model.md`](./docs/security-model.md).

---

## 📄 License

Licensed under the **Apache License 2.0** — see [`LICENSE`](./LICENSE).

---

<div align="center">

**OACP** — _the first usable multi-agent collaboration system you can actually see working._

⭐ [Star the repo](https://github.com/naaa-G/OACP) if multi-agent collaboration excites you.

</div>
