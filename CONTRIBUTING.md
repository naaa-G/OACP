# Contributing to OACP

Thank you for your interest in contributing to **OACP (Open Agent Collaboration Protocol)**.
This guide covers local setup, development workflow, and pull request expectations.

## Code of conduct

Participation is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). By contributing,
you agree to uphold it.

## Getting started

### Prerequisites

- **Node.js** ≥ 20 ([`.nvmrc`](./.nvmrc) pins the recommended version)
- **pnpm** ≥ 9 (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)

### Setup

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
pnpm install
pnpm verify    # format check, lint, typecheck, test, build
pnpm ci:act verify   # same CI job in Docker via act (see docs/ci-local-act.md)
```

See [docs/development.md](./docs/development.md) for the full developer guide.

## Repository layout

| Path              | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| `specs/`          | JSON Schemas — **source of truth** for the protocol |
| `core/`           | `@oacp/core` — protocol engine                      |
| `sdk/typescript/` | `@oacp/sdk` — TypeScript client library             |
| `docs/`           | Architecture and developer documentation            |
| `examples/`       | Runnable examples (added as features land)          |

Full layout: see the [Project Structure](https://github.com/naaa-G/OACP#-project-structure) section in `README.md`.

## Development workflow

1. **Fork** the repository and create a branch from `main`.
2. **Make focused changes** — one logical change per PR when possible.
3. **Run checks locally** before opening a PR:

   ```bash
   pnpm verify
   ```

4. **Update documentation** if you change public APIs, schemas, or behavior.
5. **Add or update tests** for new functionality.
6. **Open a pull request** with a clear description and test plan.

## Commit messages

Use clear, imperative commit messages:

```
feat(core): add task_request schema validation
fix(sdk): correct protocol version re-export
docs: update development setup for Windows
chore: bump turbo to 2.3.3
```

Prefixes: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.

## Pull request checklist

- [ ] `pnpm verify` passes locally (or `pnpm ci:act verify` for the full GitHub Verify job in Docker)
- [ ] Tests added or updated for behavior changes
- [ ] Public API or schema changes documented
- [ ] [CHANGELOG.md](./CHANGELOG.md) updated under `[Unreleased]` for user-facing changes
- [ ] No secrets, credentials, or `.env` files committed

## Protocol changes

Changes to `specs/` are **high impact**. When modifying JSON Schemas:

1. Bump the protocol `version` field only when intentionally breaking.
2. Update `docs/protocol-spec.md` and `docs/message-types.md`.
3. Add validator tests in `core/tests/`.
4. Note the change in `CHANGELOG.md`.

## Questions

- Open a [GitHub Discussion](https://github.com/naaa-G/OACP/discussions) for design questions.
- Open an [issue](https://github.com/naaa-G/OACP/issues) for bugs or feature requests.
- See [docs/community.md](./docs/community.md) for support channels and triage expectations.
- For security issues, see [SECURITY.md](./SECURITY.md) — **do not** open public issues.

## License

By contributing, you agree that your contributions will be licensed under the
[Apache License 2.0](./LICENSE).
