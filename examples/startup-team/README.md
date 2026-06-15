# Autonomous Startup Team (Day 23)

Flagship demo: **PM, Designer, Backend, Frontend, QA** collaborate on a product prompt and deliver a project scaffold — visualized live in the [playground](../../docs/playground.md).

## Quick start

```bash
pnpm build
pnpm --filter oacp-examples start:startup
```

With live playground (auto-runs the demo, then keeps polling):

```bash
pnpm --filter oacp-examples start:playground -- --loop
```

## Default prompt

```
Build a habit tracker app.
```

Override:

```bash
OACP_STARTUP_PROMPT="Build a todo list app." pnpm --filter oacp-examples start:startup
```

## CI verify

```bash
pnpm --filter oacp-examples start:startup -- --verify
pnpm --filter @oacp/sdk test -- startup-team.integration
```

## Team & workflow

| Step     | Agent               | Capability         |
| -------- | ------------------- | ------------------ |
| Plan     | Product Manager     | `startup.plan`     |
| Design   | Product Designer    | `startup.design`   |
| Backend  | Backend Developer   | `startup.backend`  |
| Frontend | Frontend Developer  | `startup.frontend` |
| Assemble | Tech Lead           | `startup.assemble` |
| QA       | QA Engineer         | `startup.qa`       |
| Deliver  | Release Coordinator | `startup.deliver`  |

Design, backend, and frontend run **in parallel** after PM planning.

Full walkthrough: [docs/startup-team.md](../../docs/startup-team.md).
