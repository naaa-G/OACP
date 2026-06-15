# Task History Example (Day 15)

Demonstrates **persistent shared memory**: task requests, responses, and outputs are
recorded in a `MemoryStore` and queryable by `trace_id`.

## Run

```bash
pnpm build
pnpm --filter oacp-examples start:memory
```

## Server-backed memory

Start the reference server with SQLite persistence (default):

```bash
OACP_MEMORY_BACKEND=sqlite OACP_MEMORY_SQLITE_PATH=.oacp/memory.db pnpm --filter @oacp/server start
```

Query history over HTTP:

```bash
curl http://localhost:3847/memory/traces/<trace-id>
curl http://localhost:3847/memory/scopes
```

PostgreSQL (production):

```bash
OACP_MEMORY_BACKEND=postgres OACP_MEMORY_POSTGRES_URL=postgres://user:pass@localhost/oacp pnpm --filter @oacp/server start
```

See [docs/memory-system.md](../../docs/memory-system.md).
