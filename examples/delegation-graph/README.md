# Delegation graph example (Day 16)

Runnable demo of the OACP delegation graph: explicit `delegate()` messages and `sendSubTask` chains under one `trace_id`.

## Run

```bash
pnpm build
pnpm --filter oacp-examples start:graph
```

## What it shows

- **Coordinator** sends a root `task_request` to the **Orchestrator**
- **Orchestrator** emits a `delegation` to the **Analyst** and also runs a `sendSubTask` chain
- **DelegationGraphRecorder** builds nodes and edges (`delegates`, `subtask`, `responds_to`)
- Prints roots, depth, topological order, and the full graph

See [docs/delegation-graph.md](../../docs/delegation-graph.md) for the API reference.
