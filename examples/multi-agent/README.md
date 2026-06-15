# Multi-Agent Hello Example

Week 1 milestone demo: two agents collaborate in a single Node.js process.

## What it does

1. Creates a shared `LocalBus`
2. Starts a **summarizer** worker (`text.summarize`)
3. Starts a **coordinator** that sends a `task_request`
4. Worker auto-responds with `task_response`
5. Prints the result and `trace_id`

## Run

Integration tests are the canonical verification (CI-safe):

```bash
pnpm --filter @oacp/core test -- tests/integration
pnpm --filter @oacp/sdk test -- multi-agent.integration
```

Optional local script:

```bash
pnpm build
pnpm install
pnpm --filter oacp-examples start:local
```

## Related

- [Basic agent flow](../../docs/examples/basic-agent-flow.md)
- [Integration testing](../../docs/integration-testing.md)
- [Agent runtime](../../docs/agent-runtime.md)
