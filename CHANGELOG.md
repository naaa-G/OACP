# OACP — Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- _(Track post-v1.0.0 changes here.)_

## [1.0.0] — 2026-07-01

**General availability** — joint launch with [MCPLab v1.0.0](https://github.com/naaa-G/MCPLab/releases/tag/v1.0.0).

### Added

- Enterprise README with Docker-first quick start, Console hero, and adoption kit links.
- MCPLab public repository links across docs, skills, and `pnpm docker:mcplab` helpers.
- GitHub Release `v1.0.0` with migration guide and verification gate (`pnpm test:day59`).
- Protocol schemas tagged **v1.0** (`specs/`); frozen OpenAPI at `GET /v1/openapi.json`; CI API freeze guard (`scripts/verify-api-freeze.mjs`).
- Migration guide `docs/migration/v0.1-to-v1.0.md` and release notes `docs/releases/v1.0.0.md`.
- Packages at semver **1.0.0**: `@oacp/core`, `@oacp/sdk`, `@oacp/server`, `@oacp/observability-client`, `@oacp/console`, `oacp-sdk`, `oacp-examples`.

### Changed

- CLI `oacp run` / `oacp serve` print **Console** deep links instead of playground URLs.
- `GET /` server index drops deprecated `playground_snapshot` — use `observability_snapshot`.
- New outbound messages use protocol `version` **`1.0`** (`PROTOCOL_VERSION`).

### Removed

- **`GET /playground/snapshot`** — returns **410 Gone** with `Link` to `/v1/observability/snapshot` (removed per Day 60 sunset).
- Legacy inline playground HTML (`playground-html.ts`) — `/playground` remains a **302** redirect to `/console/`.

### Notes

- Upgrade from **v1.0.0-rc.1**: no protocol changes; update snapshot URL and Console links only.
- See [docs/migration/v0.1-to-v1.0.md](docs/migration/v0.1-to-v1.0.md) for v0.1 → v1.0.

## [1.0.0-rc.1] — 2026-07-01 (Day 59 release candidate)

Release candidate for joint OACP + MCPLab v1.0.0 launch (Day 60).

### Added

- Day 58 adoption kit: `examples/custom-agents/`, `integrate/mcp-oacp/` MCP tools server, Cursor skills, integration docs.
- Day 59 RC gate: `pnpm test:day59`, `day59-rc-sync.test.ts` (50-trace recreate backfill), `docs/releases/v1.0.0-rc.1.md`.
- Console trace rail **All synced / Live only** filter; `VITE_OACP_CONSOLE_FLEETS` for custom fleet labels.

### Changed

- Console user guide and MCPLab flagship docs consolidated for launch (`docs/mcplab.md`, `docs/bring-your-own-agents.md`).

### Notes

- Tag: `v1.0.0-rc.1` (pre-release). Superseded by **`v1.0.0`** (Day 60 GA).
- P1 backlog items in `docs/load-security-smoke.md` are **not** RC blockers.

## [0.1.0-alpha] — 2026-06-13

Public alpha launch (Day 30). First release tagged for GitHub, HN, Reddit, and X.

### Added

- Launch day (Day 30): GitHub release notes (`.github/RELEASE_v0.1.0-alpha.md`), issue and PR
  templates, `docs/launch-day.md` social copy, `docs/post-launch.md` week-1 runbook,
  `docs/community.md`, `docs/releases/v0.1.0-alpha.md`, `scripts/tag-release` helpers.
- Repository URLs centralized in `docs/.vitepress/repo.mjs` (`naaa-G/OACP`).
  `docs/public/architecture-diagram.svg`; demo video script, screenshot capture guide,
  launch-day playbook (HN/Reddit/X templates); `scripts/capture-launch-assets` helpers;
  `docs/launch-kit.md`.
- Integration adapters (Day 28): `@oacp/integration-langchain` LangChain `StructuredTool`
  bridge (`createOacpTool`, `createOacpToolkit`, `executeOacpCapabilityTask`); Python
  `oacp-autogen` AutoGen callable and optional `FunctionTool` wrapper; examples
  `start:langchain-delegate` and `examples/integrations/autogen_delegate.py`;
  `docs/integrations.md`, `docs/integration-langchain.md`, `docs/integration-autogen.md`.
- SDK polish (Day 27): `@oacp/sdk/client` subpath export, `createAgentClient()` factory,
  `registerDevAgent()` dev helper, refreshed TypeScript SDK README; minimal Python SDK
  (`oacp-sdk`) with async `AgentClient`, httpx transport, retries, and pytest suite;
  SDK examples under `examples/sdk/` (`start:sdk-remote`, `start:sdk-workflow`);
  `docs/sdk-typescript.md` and `docs/sdk-python.md`; Python SDK CI job.
- Documentation website (Day 26): VitePress site under `docs/` with home page, What is
  OACP?, Quick start, sidebar navigation, local search, and GitHub Pages deploy workflow;
  run with `pnpm docs:dev` / `pnpm docs:build`.
- Example gallery (Day 25): coding, research, and bug-finder swarms under
  `examples/gallery/` with shared bootstrap runner, `--verify` smoke flags, and
  `docs/examples-gallery.md`; scripts `start:coding-swarm`, `start:research-swarm`,
  `start:bug-finder-swarm`.
- OACP CLI (Day 24): `@oacp/cli` with `oacp run "<prompt>"`, `oacp trace`, and `oacp serve`;
  startup team bootstrap moved to `@oacp/server`; `docs/cli.md`.
- Autonomous Startup Team (Day 23): `examples/startup-team/autonomous-startup-team.ts` — PM,
  Designer, Backend, Frontend, Tech Lead, QA, and Release agents collaborate on a product
  prompt via DAG workflow `autonomous-startup-v1`; playground wired to flagship demo;
  `docs/startup-team.md`; `pnpm --filter oacp-examples start:startup`.
- Playground UI (Day 22): live web visualization at `GET /playground` with agent registry,
  delegation graph (SVG), message flow feed, and unified `GET /playground/snapshot` poll API;
  `docs/playground.md`; `examples/playground/live-demo.ts`
  (`pnpm --filter oacp-examples start:playground`).
- Demo v2 (Day 21): `examples/demo-v2/structured-task-chain.ts` — Week 3 capstone with DAG
  workflow, memory, delegation graph, recovery, and trace observability;
  `AgentClient.runWorkflow()`; `docs/demo-v2.md`; `pnpm --filter oacp-examples start:demo-v2`.
- Observability (Day 20): `OacpLogger`, `createConsoleLogger`, trace timeline and `TraceBundle`
  builders in `@oacp/core`; `TraceClient` and `oacp-trace` CLI; HTTP trace API
  (`GET /traces`, `GET /traces/:traceId`, `GET /trace-viewer`) on server;
  `docs/observability.md`; `examples/observability/trace-viewer.ts`
  (`pnpm --filter oacp-examples start:trace`).
- Subtask decomposition (Day 17): `SubtaskPlan`, `SubtaskPlanner`, `executeSubtaskPlan`,
  `decomposeAndExecute`, `planExecutionBatches` in `@oacp/core`; `ExecutionContext.executePlan`;
  `docs/subtask-decomposition.md`; `examples/workflow/subtask-decomposition.ts`
  (`pnpm --filter oacp-examples start:workflow`).
- DAG workflow engine (Day 18): `WorkflowEngine`, `runWorkflow`, `executeDagPlan`,
  `InMemoryWorkflowRunStore` in `@oacp/core`; HTTP workflow API on server
  (`GET/POST /workflows`, `POST /workflows/:id/run`, `GET /workflows/runs/:runId`);
  `docs/workflow-engine.md`; `examples/workflow/dag-engine.ts`
  (`pnpm --filter oacp-examples start:workflow-engine`); `Agent.agentRuntime` on SDK.
- Failure recovery (Day 19): `sendTaskWithRecovery`, `TaskRecoveryPolicy`, alternate-agent
  failover and fallback capabilities in `@oacp/core`; recovery on workflows and subtask plans;
  `docs/failure-recovery.md`; `examples/resilience/failure-recovery.ts`
  (`pnpm --filter oacp-examples start:recovery`).
- Task delegation graph (Day 16): `DelegationGraphRecorder`, `InMemoryDelegationGraphStore`,
  graph builder and query helpers in `@oacp/core`; `GET /graph/traces/:traceId` on server;
  `sendSubTask` parent links for pipeline chains; `docs/delegation-graph.md`;
  `examples/delegation-graph/delegation-chain.ts` (`pnpm --filter oacp-examples start:graph`).
- Shared memory store (Day 15): `MemoryStore` port, `TaskMemoryRecorder`, `MemoryScopeManager`,
  `InMemoryMemoryStore` in `@oacp/core`; `SqliteMemoryStore` and `PostgresMemoryStore` in
  `@oacp/server`; HTTP memory API (`GET /memory/traces/:traceId`, etc.).
- SQLite memory store auto-creates parent directories for the configured database path.
- `docs/memory-system.md` — persistence guide; `examples/memory/task-history.ts`.
- Demo v1 (Day 14): `examples/demo-v1/network-collaboration.ts` — remote coordinator + document
  pipeline (Orchestrator → Analyzer → Reporter) over HTTP; `pnpm --filter oacp-examples start:demo`.
- `docs/demo-v1.md` — Week 2 capstone walkthrough, sequence diagram, and sample output.
- SDK integration smoke test `demo-v1.integration.test.ts` for Demo v1 contract.
- Multi-agent pipeline (Day 13): `sendSubTask`, `runPipeline`, `TaskPipeline` for A → B → C chains.
- `docs/multi-agent-pipeline.md` and `examples/pipeline/agent-chain.ts`.
- Reliable remote delivery (Day 12): `executeWithRetry`, exponential backoff with jitter, `REMOTE_HTTP_DELIVERY_GUARANTEE`.
- `AgentClient` HTTP retries for transient failures; `retryPolicy` and `deliveryGuarantee` on client.
- `docs/reliable-delivery.md` — retry policy, idempotency, and timeout guide.
- Capability-based auto-routing (Day 11): send without `to`, deterministic `first` selection, routing metadata on `POST /send-message`.
- `CapabilityRouter` on server — registry-to-bus sync before auto-route.
- Bus registration merge — `POST /agents` preserves existing runtime handlers.
- `docs/capability-routing.md` — auto-routing guide.
- Capability discovery on `@oacp/server`: `GET /capabilities/:capability/agents`, `GET /agents?capability=` (Day 10).
- `AgentRegistry.findByCapability()` with in-memory capability index (Day 10).
- `AgentClient.findAgentsByCapability()` and `listAgents()` in `@oacp/sdk` (Day 10).
- `docs/registry-design.md` updated for Day 10 discovery API.
- `AgentClient` in `@oacp/sdk` for remote HTTP messaging: `send()`, `sendTask()`, `receiveMessage()` (Day 9).
- `GET /agent/:id/messages` on server for remote mailbox pull (Day 9).
- `docs/remote-client.md` — remote client API and error handling.
- `@oacp/server` reference HTTP server with Fastify: `POST /send-message`, `GET /agent/:id`, `POST /agents` (Day 8).
- `docs/http-server.md` — API reference, error format, and deployment notes.
- Week 1 integration tests: `core/tests/integration/multi-agent.test.ts`, SDK `multi-agent.integration.test.ts` (Day 7).
- Runnable example `examples/multi-agent/hello-agents.ts` and `docs/integration-testing.md`.
- Agent runtime: `AgentRuntime`, `createAgentRuntime`, `sendTask`, `receiveTask`, `respond` (Day 6).
- SDK `Agent` and `LocalBus` classes with README-aligned quick-start API.
- `docs/agent-runtime.md` — runtime lifecycle, task modes, and error codes.
- In-memory message bus: `createMessageBus`, `InMemoryMessageBus`, `TraceStore`, routing by agent URI or capability (Day 5).
- `docs/message-bus.md` — bus API, routing rules, and trace tracking.
- Message validator: `validateMessage`, `parseMessage`, `MessageValidator` (Day 4).
- Agent identity JSON Schema (`specs/agent/identity.schema.json`) with PEM/JWK public keys.
- Capability declaration and registry schemas (`specs/agent/capabilities.schema.json`).
- Agent permissions schema (`specs/agent/permissions.schema.json`).
- AJV-based validation in `@oacp/core`: `validateAgentIdentity`, `CapabilityCatalog`, permission helpers.
- Agent example payloads and `docs/agent-identity.md`.
- JSON Schemas for OACP `v0.1` core messages: `task_request`, `task_response`, `delegation`, `capability_query`.
- Base schema `specs/oacp.schema.json` with shared `$defs` and message envelope.
- Example payloads in `specs/examples/`.
- `@oacp/core` schema registry (`loadMessageSchema`, `MESSAGE_TYPES`, bundled `core/schemas/`).
- Protocol schema integrity tests in `core/tests/protocol.test.ts`.
- Updated protocol documentation in `docs/protocol-spec.md` and `docs/message-types.md`.
- Monorepo bootstrap with pnpm workspaces and Turborepo.
- `@oacp/core` package — protocol engine foundation (`v0.1.0`).
- `@oacp/sdk` TypeScript SDK — initial workspace package (`v0.1.0`).
- Shared TypeScript, ESLint, Prettier, and EditorConfig tooling.
- Developer documentation under `docs/`.
- CI workflow for lint, typecheck, test, and build.
- Enterprise repo files: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `ROADMAP.md`.

### Changed

- Message schemas: `unevaluatedProperties: false` + root `type: "object"` for strict AJV validation across `allOf` composition.
- README updated with Day 1 development workflow and Day 2 protocol status.

## [0.1.0] — 2026-06-12

### Added

- Initial project documentation: `README.md`, `plan.md`, `structure.md`.
- Repository folder layout for protocol, core, SDK, server, playground, and tooling.

[Unreleased]: https://github.com/naaa-G/OACP/compare/v0.1.0-alpha...HEAD
[0.1.0-alpha]: https://github.com/naaa-G/OACP/releases/tag/v0.1.0-alpha
[0.1.0]: https://github.com/naaa-G/OACP/releases/tag/v0.1.0
