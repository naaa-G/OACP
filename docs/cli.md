# OACP CLI (Day 24)

Enterprise-grade command-line interface for running agent teams, inspecting traces, and
starting the reference server.

## Install (monorepo)

```bash
pnpm install
pnpm build

# From repo root (recommended during development)
pnpm oacp --help
pnpm oacp run "build todo app"
```

## Quick start

```bash
# Flagship: run the Autonomous Startup Team on a prompt
pnpm oacp run "build todo app"

# Shorthand (prompt as first argument)
pnpm oacp "build habit tracker"

# JSON output for CI/scripts
pnpm oacp run "build todo app" --format json

# Keep server alive for playground
pnpm oacp run "build todo app" --keep-alive
```

## Commands

### `oacp run <prompt>`

Spins up an ephemeral OACP server with the **Autonomous Startup Team**, runs workflow
`autonomous-startup-v1`, prints the repo scaffold and playground URL.

| Option                | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| `--format json\|text` | Output format (default: text)                              |
| `--keep-alive`        | Keep server running after workflow (for playground)        |
| `--base-url URL`      | Use existing server instead of ephemeral bootstrap         |
| `--port, -p`          | Listen port (default: ephemeral; 3000 with `--keep-alive`) |
| `--quiet, -q`         | Suppress progress logs                                     |

Environment: `OACP_TIMEOUT_MS`, `OACP_PORT`

### `oacp trace`

Inspect traces on a **running** server (same capabilities as `oacp-trace`).

Start a server first — ephemeral `oacp run` exits when done unless you pass `--keep-alive`:

```bash
# Option A: dedicated server
pnpm oacp serve --bootstrap startup

# Option B: keep playground open after a run
pnpm oacp run "build todo app" --keep-alive

# Then, in another terminal:
pnpm oacp trace --list
pnpm oacp trace <trace-id>
pnpm oacp trace <trace-id> --format json
```

Environment: `OACP_BASE_URL` (default `http://127.0.0.1:3000`)

### `oacp serve`

Start the reference HTTP server.

```bash
oacp serve
oacp serve --bootstrap startup --port 3000
```

| Option                | Description                            |
| --------------------- | -------------------------------------- |
| `--bootstrap startup` | Preload startup team agents + workflow |
| `--port, -p`          | Listen port (default: 3000)            |
| `--host`              | Bind host (default: 127.0.0.1)         |

## Architecture

```text
oacp run
   │
   ├─ createApp() + bootstrapStartupTeam()
   ├─ AgentClient.runWorkflow('autonomous-startup-v1')
   └─ stdout (text/json) + playground URL
```

Bootstrap logic lives in `@oacp/server` (`bootstrap/startup-team.ts`) — shared with examples
and playground.

## Related

- [Startup team demo](../docs/startup-team.md)
- [Playground](../docs/playground.md)
- [HTTP server](../docs/http-server.md)
