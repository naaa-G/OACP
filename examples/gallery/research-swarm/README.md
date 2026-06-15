# Research swarm (Day 25)

Gather sources, extract keywords and rank in parallel, analyze, synthesize, and publish a brief.

## Run

```bash
pnpm build
pnpm --filter oacp-examples start:research-swarm
pnpm --filter oacp-examples start:research-swarm -- --verify
```

## Workflow

```
Gatherer → (Keyword extractor ∥ Source ranker) → Analyzer → Synthesizer → Publisher
```

Capabilities: `research.gather`, `research.keywords`, `research.rank`, `research.analyze`, `research.synthesize`, `research.publish`

## Env

| Variable              | Default                        |
| --------------------- | ------------------------------ |
| `OACP_RESEARCH_TOPIC` | `WebAssembly for edge compute` |

Guide: [`docs/examples-gallery.md`](../../docs/examples-gallery.md#research-swarm)
