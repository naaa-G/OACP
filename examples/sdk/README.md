# SDK examples (Day 27)

Runnable examples for `@oacp/sdk` and `oacp-sdk` (Python).

## TypeScript

```bash
pnpm build

# Local agents (no server)
pnpm --filter oacp-examples start:local

# Remote client (server must have workers)
pnpm oacp serve --bootstrap startup
pnpm --filter oacp-examples start:sdk-workflow

# Remote client (server must have workers)
pnpm oacp serve --bootstrap startup   # or --bootstrap demo
pnpm --filter oacp-examples start:sdk-remote
```

## Python

```bash
pip install -e "sdk/python[dev]"
# With server running:
python examples/sdk/hello_remote.py
```

Guides: [`docs/sdk-typescript.md`](../../docs/sdk-typescript.md) · [`docs/sdk-python.md`](../../docs/sdk-python.md)
