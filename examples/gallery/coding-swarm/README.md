# Coding swarm (Day 25)

Plan → implement → review → test → deliver over HTTP with shared memory, delegation graph, and traces.

## Run

```bash
pnpm build
pnpm --filter oacp-examples start:coding-swarm
pnpm --filter oacp-examples start:coding-swarm -- --verify
```

## Workflow

```
Planner → Implementer → Reviewer → Tester → Deliverer
```

Capabilities: `code.plan`, `code.implement`, `code.review`, `code.test`, `code.deliver`

## Env

| Variable             | Default                    |
| -------------------- | -------------------------- |
| `OACP_CODING_MODULE` | `auth-service`             |
| `OACP_CODING_TASK`   | `rate limiting middleware` |

Guide: [`docs/examples-gallery.md`](../../docs/examples-gallery.md#coding-swarm)
