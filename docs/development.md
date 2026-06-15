# Development Guide

This guide covers local development for the OACP monorepo.

## Prerequisites

| Tool    | Version | Notes                                                        |
| ------- | ------- | ------------------------------------------------------------ |
| Node.js | ≥ 20    | Use [`.nvmrc`](../.nvmrc): `nvm use`                         |
| pnpm    | ≥ 9     | `corepack enable && corepack prepare pnpm@9.15.0 --activate` |
| Git     | latest  | —                                                            |

## First-time setup

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
pnpm install
pnpm verify
```

`pnpm verify` runs the full quality gate: format check, build, lint, typecheck, and test.

## Monorepo structure

This repository uses **pnpm workspaces** and **Turborepo**.

| Package        | Path              | Description                                    |
| -------------- | ----------------- | ---------------------------------------------- |
| `@oacp/core`   | `core/`           | Protocol engine (validation, routing, runtime) |
| `@oacp/sdk`    | `sdk/typescript/` | TypeScript SDK for agent authors               |
| `@oacp/server` | `server/`         | Reference HTTP server (Day 8+)                 |

Workspace packages reference each other with `workspace:*` in `package.json`.

## Common commands

Run from the repository root:

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `pnpm install`      | Install all workspace dependencies             |
| `pnpm build`        | Build all packages (respects dependency order) |
| `pnpm dev`          | Watch mode for packages that support it        |
| `pnpm test`         | Run all package tests                          |
| `pnpm lint`         | ESLint across the repo                         |
| `pnpm lint:fix`     | ESLint with auto-fix                           |
| `pnpm format`       | Prettier write                                 |
| `pnpm format:check` | Prettier check (CI uses this)                  |
| `pnpm typecheck`    | TypeScript `--noEmit` in all packages          |
| `pnpm verify`       | Full local CI gate                             |
| `pnpm clean`        | Remove build artifacts                         |

### Package-scoped commands

```bash
pnpm --filter @oacp/core test
pnpm --filter @oacp/sdk build

# Week 1 multi-agent integration tests (Day 7 milestone)
pnpm --filter @oacp/core test -- tests/integration
pnpm --filter @oacp/sdk test -- multi-agent.integration
```

See [integration-testing.md](./integration-testing.md) for scenario coverage.

### Reference server (Day 8)

```bash
pnpm --filter @oacp/server build
pnpm --filter @oacp/server start   # http://0.0.0.0:3847
pnpm --filter @oacp/server test
```

API reference: [http-server.md](./http-server.md).

### Remote client (Day 9)

```bash
pnpm --filter @oacp/sdk test -- remote-messaging
```

See [remote-client.md](./remote-client.md) for `AgentClient` usage.

### Capability discovery (Day 10)

```bash
pnpm --filter @oacp/server test -- agent-registry
pnpm --filter @oacp/sdk test -- capability-discovery
```

See [registry-design.md](./registry-design.md) for discovery API and index behavior.

### Capability auto-routing (Day 11)

```bash
pnpm --filter @oacp/server test -- capability-routing
pnpm --filter @oacp/sdk test -- auto-routing
```

See [capability-routing.md](./capability-routing.md).

### Reliable delivery (Day 12)

```bash
pnpm --filter @oacp/core test -- retry-policy
pnpm --filter @oacp/sdk test -- retry
```

See [reliable-delivery.md](./reliable-delivery.md).

### Multi-agent pipeline (Day 13)

```bash
pnpm --filter @oacp/core test -- pipeline-chain
pnpm --filter @oacp/sdk test -- pipeline.integration
pnpm --filter oacp-examples start:pipeline
```

See [multi-agent-pipeline.md](./multi-agent-pipeline.md).

### Demo v1 — network collaboration (Day 14)

```bash
pnpm --filter oacp-examples start:demo
pnpm --filter @oacp/sdk test -- demo-v1.integration
```

See [demo-v1.md](./demo-v1.md) for the Week 2 capstone walkthrough.

### Demo v2 — structured task chain (Day 21)

```bash
pnpm --filter oacp-examples start:demo-v2
pnpm --filter oacp-examples start:demo-v2 -- --verify
pnpm --filter @oacp/sdk test -- demo-v2.integration
```

See [demo-v2.md](./demo-v2.md) for the Week 3 capstone walkthrough.

### Autonomous Startup Team — flagship demo (Day 23)

```bash
pnpm --filter oacp-examples start:startup
pnpm --filter oacp-examples start:startup -- --verify
pnpm --filter @oacp/sdk test -- startup-team.integration
pnpm --filter oacp-examples start:playground -- --loop
```

See [startup-team.md](./startup-team.md).

### OACP CLI (Day 24)

```bash
pnpm --filter @oacp/cli exec oacp run "build todo app"
pnpm --filter @oacp/cli exec oacp run "build habit tracker" --format json
pnpm --filter @oacp/cli test
```

See [cli.md](./cli.md).

### Playground — live visualization (Day 22)

```bash
pnpm --filter oacp-examples start:playground
pnpm --filter oacp-examples start:playground -- --loop
pnpm --filter @oacp/server test -- playground-api
```

Open `http://127.0.0.1:3000/playground`. See [playground.md](./playground.md).

### Shared memory (Day 15)

```bash
pnpm --filter oacp-examples start:memory
pnpm --filter @oacp/core test -- memory
pnpm --filter @oacp/server test -- memory-store
```

See [memory-system.md](./memory-system.md).

## Tooling

| Tool         | Config                                                                                |
| ------------ | ------------------------------------------------------------------------------------- |
| TypeScript   | [`tsconfig.base.json`](../tsconfig.base.json) — strict mode, `NodeNext` modules       |
| ESLint       | [`eslint.config.mjs`](../eslint.config.mjs) — flat config, `typescript-eslint` strict |
| Prettier     | [`prettier.config.mjs`](../prettier.config.mjs)                                       |
| EditorConfig | [`.editorconfig`](../.editorconfig)                                                   |
| Turborepo    | [`turbo.json`](../turbo.json)                                                         |
| Vitest       | Per-package `vitest.config.ts`                                                        |

Recommended VS Code extensions are listed in [`.vscode/extensions.json`](../.vscode/extensions.json).

## Adding a new workspace package

1. Create the package directory with `package.json`, `tsconfig.json`, and `src/index.ts`.
2. Add the path to [`pnpm-workspace.yaml`](../pnpm-workspace.yaml).
3. Add a project reference in root [`tsconfig.json`](../tsconfig.json) if applicable.
4. Run `pnpm install` from the root.

## CI

GitHub Actions runs on every push and pull request to `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm format:check`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm test`
6. `pnpm build`

Reproduce locally with `pnpm verify`.

## Protocol development workflow

1. **Define** message schemas in `specs/` (source of truth).
2. **Implement** validation and types in `@oacp/core`.
3. **Expose** developer APIs in `@oacp/sdk`.
4. **Test** with unit tests and integration tests in `core/tests/` and `examples/`.
5. **Document** in `docs/protocol-spec.md` and `docs/message-types.md`.

## Troubleshooting

### `pnpm` not found

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

### Stale build artifacts

```bash
pnpm clean
pnpm build
```

### Type errors after pulling

```bash
pnpm install
pnpm build
```

## Next steps (Week 1)

After Day 1 bootstrap, the next tasks are:

1. **Day 2** — Add JSON Schemas to `specs/messages/`
2. **Day 3** — Agent identity schemas in `specs/agent/`
3. **Day 4–7** — Validator, message bus, runtime, integration test

See the [README roadmap](https://github.com/naaa-G/OACP#-roadmap) for the full milestone plan.

## Documentation website (Day 26)

The docs site is built with [VitePress](https://vitepress.dev/) from the `docs/` folder.

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `pnpm docs:dev`     | Local dev server with hot reload     |
| `pnpm docs:build`   | Production static build              |
| `pnpm docs:preview` | Preview the production build locally |

Source layout:

```text
docs/
├── .vitepress/       # VitePress config and theme
├── index.md          # Home page (hero + features)
├── what-is-oacp.md   # Positioning and architecture
├── quick-start.md    # 5-minute getting started
└── …                 # Existing protocol and demo guides
```

CI runs `pnpm docs:build` on every push. Pushes to `main` deploy to **GitHub Pages** via
[`.github/workflows/docs.yml`](../.github/workflows/docs.yml) at
[`https://naaa-g.github.io/OACP`](https://naaa-g.github.io/OACP). Set `VITEPRESS_BASE` when
hosting under a project path (e.g. `/OACP/` for this repository).

### Repository URLs (single source of truth)

Canonical clone, repo, and docs-site URLs live in [`docs/.vitepress/repo.mjs`](./.vitepress/repo.mjs).
VitePress imports them in [`config.mjs`](./.vitepress/config.mjs) for nav, social links, and
“edit on GitHub”. When the GitHub org/repo or Pages URL changes, update `repo.mjs` once —
Markdown clone snippets in README and guides should match those constants.

## Launch kit (Day 29)

Assets and playbooks for demos and public launch:

| Doc                                            | Purpose                              |
| ---------------------------------------------- | ------------------------------------ |
| [launch-kit.md](./launch-kit.md)               | Pre-launch checklist, elevator pitch |
| [demo-video-script.md](./demo-video-script.md) | 3–5 minute recording script          |
| [screenshots.md](./screenshots.md)             | Capture playground & CLI visuals     |
| [launch-day.md](./launch-day.md)               | HN, Reddit, X templates (Day 30)     |
| [post-launch.md](./post-launch.md)             | Week 1 triage after public launch    |
| [community.md](./community.md)                 | Support channels and triage SLA      |

Static assets live in `docs/public/` (e.g. `architecture-diagram.svg`). Capture helpers:
`scripts/capture-launch-assets.ps1` / `.sh`. Release helper: `scripts/tag-release.ps1` / `.sh`.
