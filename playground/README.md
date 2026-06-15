# Playground

OACP's **live visual playground** ships as part of `@oacp/server` — no separate frontend build.

## Run

```bash
pnpm build
pnpm --filter oacp-examples start:playground
```

Then open `http://127.0.0.1:3000/playground`.

## Documentation

- [docs/playground.md](../docs/playground.md) — architecture, API, enterprise usage
- [examples/playground/README.md](../examples/playground/README.md) — runnable demo options

## Endpoints

| URL                        | Purpose       |
| -------------------------- | ------------- |
| `GET /playground`          | Web UI        |
| `GET /playground/snapshot` | Live poll API |

The Day 20 trace viewer remains at `GET /trace-viewer` for lightweight diagnostics.
