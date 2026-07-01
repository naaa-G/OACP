# Run CI locally with act + Docker

Rehearse [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) on your machine before pushing.

## Prerequisites

1. **Docker Desktop** — running (Linux containers / WSL2 backend on Windows).
2. **[act](https://github.com/nektos/act)** — `act --version` (**0.2.86+**; older builds have known CVEs).
3. **Disk space** — first run pulls runner images (`act-latest` ~500MB; `full-latest` ~17GB for e2e).

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

| Problem                                | Fix                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `act` asks to pick an image            | Ensure `.actrc` exists in repo root; or set `%LOCALAPPDATA%\act\actrc` with the same `-P` line      |
| Docker not running                     | Start Docker Desktop                                                                                |
| `playwright install --with-deps` fails | E2E uses `full-latest` automatically; pre-pull: `docker pull catthehacker/ubuntu:full-latest`       |
| Docker job cannot reach daemon         | `pnpm ci:act docker` adds `--privileged` and socket mount; restart Docker Desktop if it still fails |
| act much slower than GitHub            | Expected — no hosted-runner cache; first pull is large                                              |
| Prettier reports hundreds of files     | `pnpm install` in act creates `.pnpm-store/`; ignored via `.prettierignore` (do not remove)         |

## When to use act vs host commands

| Goal                         | Command                                     |
| ---------------------------- | ------------------------------------------- |
| Prettier / lint / unit tests | `pnpm verify` (fast, on host)               |
| Linux-only E2E differences   | `pnpm ci:act e2e`                           |
| Full pre-push gate           | `pnpm ci:act verify` then `pnpm ci:act e2e` |
| RC / release gate            | `pnpm test:day59`                           |
