# Run CI locally with act + Docker

Rehearse [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) on your machine before pushing.

## Prerequisites

1. **Docker Desktop** — running (Linux containers / WSL2 backend on Windows).
2. **[act](https://github.com/nektos/act)** — `act --version` (**0.2.86+**; older builds have known CVEs).
3. **Disk space** — first run pulls runner images (`act-latest` ~2GB on disk; `full-latest` ~17GB download / **~70GB on disk** for e2e).

Repo root includes [`.actrc`](../.actrc) (`act-latest` by default). E2E and Docker jobs auto-select `full-latest`.

## Quick commands

```bash
# Pre-pull runner images (recommended once)
pnpm ci:act:pull          # verify / python (~500MB)
pnpm ci:act:pull:full     # e2e / docker (~17GB, optional until needed)

# Same as CI Verify job (format, build, lint, typecheck, test, day55, docs)
pnpm ci:act verify

# Console Playwright (linux Chromium — closest to GitHub)
pnpm ci:act e2e

# Python SDK job
pnpm ci:act python

# Docker Compose smoke (host Docker socket mounted into act)
pnpm ci:act docker

# All jobs in ci.yml (slow)
pnpm ci:act all
```

Dry-run (print steps, do not execute):

```bash
pnpm ci:act verify -n
```

## What each job maps to

| `pnpm ci:act` | GitHub job       | Notes                                                 |
| ------------- | ---------------- | ----------------------------------------------------- |
| `verify`      | Verify           | Runs `pnpm verify` + day55/day56/day59 + `docs:build` |
| `e2e`         | Console E2E      | Full Playwright suite in Linux container              |
| `python`      | Python SDK       | `scripts/verify-python.sh`                            |
| `docker`      | Docker Compose   | Build image, health check, seed demo                  |
| `all`         | All of the above | Sequential; allow 30–60+ minutes                      |

## Windows notes

- Run from **PowerShell** or **Git Bash** in the repo root.
- Keep **Docker Desktop** started before `pnpm ci:act`.
- Local folders `MCPLab/` and `ATDN/` are gitignored and are **not** sent to the act container — matches clean CI checkout.
- For fastest feedback on formatting/lint only, `pnpm verify` on the host is still quicker than a full act run.

## Troubleshooting

| Problem                                  | Fix                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `act` asks to pick an image              | Ensure `.actrc` exists in repo root; or set `%LOCALAPPDATA%\act\actrc` with the same `-P` line                                                         |
| Docker not running                       | Start Docker Desktop                                                                                                                                   |
| `playwright install --with-deps` fails   | E2E uses `full-latest` automatically; pre-pull: `docker pull catthehacker/ubuntu:full-latest`                                                          |
| Docker job cannot reach daemon           | `pnpm ci:act docker` uses `--privileged` and `--container-daemon-socket` (not `-v`, which is verbose in act); restart Docker Desktop if it still fails |
| act much slower than GitHub              | Expected — no hosted-runner cache; first pull is large                                                                                                 |
| E2E stuck on `docker pull full-latest`   | Image may already be local; `ci:act` uses `--pull=false`. Pre-pull once: `pnpm ci:act:pull:full`                                                       |
| Orphan `act-*` containers after cancel   | `docker ps -a --filter "name=act-"` then `docker rm -f <name>` (or stop all: see below)                                                                |
| Prettier reports hundreds of files       | `pnpm install` in act creates `.pnpm-store/`; ignored via `.prettierignore` (do not remove)                                                            |
| `@oacp/server#test` SQLite failures      | act sets `OACP_TEST_SQLITE_DIR=/tmp/oacp-tests` (avoid Windows bind-mount WAL quirks); re-run verify                                                   |
| Snapshot `traces.length` < `trace_count` | Default discovery limit is **10** — use `?limit=N` on snapshot GET in tests and clients                                                                |

## SQLite test paths

Server integration tests that persist SQLite state use `isolatedSqlitePath()` (`server/tests/sqlite-test-path.ts`). When `OACP_TEST_SQLITE_DIR` is set (act does this to `/tmp/oacp-tests`), databases are created there instead of `.oacp/` on the repo bind mount.

SDK integration tests use `createSdkTestApp()` with `memoryBackend: 'memory'` so parallel runs do not share `.oacp/memory.db`.

## Clean up stale act containers

If you cancel `pnpm ci:act` mid-run, act job containers may keep running:

```powershell
docker ps -a --filter "name=act-"
docker rm -f <container-name>
```

Or remove all act containers:

```powershell
docker ps -aq --filter "name=act-" | ForEach-Object { docker rm -f $_ }
```

## When to use act vs host commands

| Goal                         | Command                                     |
| ---------------------------- | ------------------------------------------- |
| Prettier / lint / unit tests | `pnpm verify` (fast, on host)               |
| Linux-only E2E differences   | `pnpm ci:act e2e`                           |
| Full pre-push gate           | `pnpm ci:act verify` then `pnpm ci:act e2e` |
| RC / release gate            | `pnpm test:day59`                           |
