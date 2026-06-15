# Workflow examples (Days 17–18)

## Day 17 — Subtask decomposition

Orchestrator agent that **plans** and **executes** a multi-step workflow under one `trace_id`.

```bash
pnpm build
pnpm --filter oacp-examples start:workflow
```

### Scenario

1. **Coordinator** sends `orchestrate.decompose` with a research topic
2. **Orchestrator** uses `createFunctionSubtaskPlanner` to build a plan:
   - `tokenize` and `classify` run **in parallel** (no mutual dependencies)
   - `analyze` waits for both
   - `summarize` waits for `analyze`
3. `ctx.decomposeAndExecute({ planner })` runs the plan via `sendSubTask`
4. Decisions and subtasks are recorded in memory and the delegation graph

See [docs/subtask-decomposition.md](../../docs/subtask-decomposition.md).

## Day 18 — DAG workflow engine

Registered workflow definitions executed by a **coordinator** `AgentRuntime` via `WorkflowEngine`.

```bash
pnpm build
pnpm --filter oacp-examples start:workflow-engine
```

### Scenario

1. Register a `document-dag` workflow with tokenize → summarize steps
2. Start worker agents and a coordinator
3. `engine.run('document-dag', coordinator.agentRuntime, {})` executes the DAG
4. Run record shows status, trace, and per-step outputs

See [docs/workflow-engine.md](../../docs/workflow-engine.md).
