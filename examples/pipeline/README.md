# Multi-Agent Pipeline (A → B → C)

Week 2 Day 13 demo: three agents collaborate in a chain using `sendSubTask`.

## Flow

```text
Coordinator
    │ task_request (orchestrate.pipeline)
    ▼
Orchestrator (A)
    │ sendSubTask → text.transform
    ▼
Transformer (B)
    │ sendSubTask → text.summarize
    ▼
Summarizer (C)
    │ task_response
    ▼
… responses bubble back to Coordinator
```

All hops share one `trace_id` for observability.

## Run

```bash
pnpm build
pnpm --filter oacp-examples start:pipeline
```

Integration tests:

```bash
pnpm --filter @oacp/core test -- pipeline-chain
pnpm --filter @oacp/sdk test -- pipeline.integration
```

## Related

- [Multi-agent pipeline](../../docs/multi-agent-pipeline.md)
- [Agent runtime](../../docs/agent-runtime.md)
