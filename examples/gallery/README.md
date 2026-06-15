# Example gallery (Day 25)

Three production-style multi-agent swarms demonstrating different collaboration patterns over HTTP.

| Swarm                             | Pattern                          | Command                                              |
| --------------------------------- | -------------------------------- | ---------------------------------------------------- |
| [Coding](./coding-swarm/)         | Linear review pipeline           | `pnpm --filter oacp-examples start:coding-swarm`     |
| [Research](./research-swarm/)     | Parallel enrichment DAG          | `pnpm --filter oacp-examples start:research-swarm`   |
| [Bug finder](./bug-finder-swarm/) | Resilient reproduce + root-cause | `pnpm --filter oacp-examples start:bug-finder-swarm` |

All swarms share:

- `@oacp/server` HTTP runtime with registry and capability routing
- DAG workflows via `WorkflowEngine`
- Shared memory, delegation graph, and trace observability
- `--verify` CI smoke flags
- Playground deep links (`/playground?trace_id=…`)

Full guide: [`docs/examples-gallery.md`](../../docs/examples-gallery.md)
