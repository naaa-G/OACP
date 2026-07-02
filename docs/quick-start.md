# Quick start

Get OACP running locally and watch a multi-agent team complete a task in **under 5 minutes**.

## Docker (fastest — no Node required)

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
docker compose up --build -d
```

Open **http://127.0.0.1:3847/console/**. Seed a MCPLab-style demo trace:

```bash
docker compose --profile demo up --build
```

Full showcase with [MCPLab](https://github.com/naaa-G/MCPLab) (client-only — no embedded OACP in MCPLab):

```bash
git clone https://github.com/naaa-G/MCPLab.git MCPLab
pnpm docker:mcplab
```

See [docker-compose.md](./docker-compose.md).

## Prerequisites (local development)

| Tool    | Version |
| ------- | ------- |
| Node.js | ≥ 20    |
| pnpm    | ≥ 9     |

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate
```

## 1. Clone and build

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
pnpm install
pnpm build
```

## 2. Run the flagship demo (CLI)

The fastest path — ephemeral server + Autonomous Startup Team:

```bash
pnpm oacp run "build todo app"
```

Expected output includes a repo scaffold, QA approval, trace ID, and playground URL.

JSON output for scripts:

```bash
pnpm oacp run "build todo app" --format json
```

Keep the server alive to explore the playground:

```bash
pnpm oacp run "build todo app" --keep-alive
# Open the printed playground URL, then Ctrl+C to stop
```

## 3. Or run the full demo script

```bash
pnpm --filter oacp-examples start:startup
pnpm --filter oacp-examples start:startup -- --verify   # CI smoke
```

Guide: [Startup team](/startup-team).

## 4. Open the playground

With a server running (`--keep-alive`, `oacp serve`, or `start:playground`):

```bash
pnpm --filter oacp-examples start:playground
# Browser: http://127.0.0.1:3000/playground
```

You will see agents as nodes, live message flow, and the delegation graph. Deep-link with `?trace_id=<uuid>` from CLI output.

Guide: [Playground](/playground).

## 5. Try the example gallery

Three swarms showing different collaboration patterns:

```bash
pnpm --filter oacp-examples start:coding-swarm
pnpm --filter oacp-examples start:research-swarm
pnpm --filter oacp-examples start:bug-finder-swarm
```

Guide: [Example gallery](/examples-gallery).

## 6. Hello, two agents (Week 1)

Minimal in-process flow — no HTTP server:

```bash
pnpm --filter oacp-examples start:local
```

## Common commands

| Command                               | Purpose                                                  |
| ------------------------------------- | -------------------------------------------------------- |
| `pnpm verify`                         | Full quality gate (format, lint, typecheck, test, build) |
| `pnpm oacp serve --bootstrap startup` | Long-running reference server                            |
| `pnpm oacp trace --list`              | List traces (server must be running)                     |
| `pnpm docs:dev`                       | Local documentation site                                 |

## Troubleshooting

**`oacp trace` fails with connection error** — start a server first (`oacp serve` or `oacp run --keep-alive`). See [CLI](/cli).

**Playground empty on first load** — wait for the auto-run workflow or pass `--loop` to the playground demo.

**Port 3000 in use** — set `OACP_PORT=3001` or use `--port 3001`.

## What's next?

- [What is OACP?](/what-is-oacp) — positioning and architecture diagrams
- [Development guide](/development) — contributing and package commands
- [HTTP server](/http-server) — API reference
- [Agent runtime](/agent-runtime) — build your first agent
