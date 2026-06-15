# Community & support

How to get help, report issues, and contribute after the **v0.1.0-alpha** public launch.

## Channels

| Channel                                                                       | Use for                                        | Response target                    |
| ----------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| [GitHub Discussions](https://github.com/naaa-G/OACP/discussions)              | Questions, ideas, show-and-tell demos          | Best effort, 3–5 business days     |
| [GitHub Issues](https://github.com/naaa-G/OACP/issues)                        | Confirmed bugs, tracked feature requests       | Triage within 48h                  |
| [Security advisories](https://github.com/naaa-G/OACP/security/advisories/new) | Vulnerabilities only — **never** public issues | Acknowledge within 3 business days |

## Before you open an issue

1. Search [existing issues](https://github.com/naaa-G/OACP/issues) and [discussions](https://github.com/naaa-G/OACP/discussions).
2. Reproduce on latest `main` with `pnpm verify` passing locally.
3. Include OS, Node/pnpm versions, and the command you ran (`pnpm oacp run …`, example script, etc.).
4. For playground problems, include the `trace_id` and `playground_url` from CLI output.

## Contributing

See [CONTRIBUTING.md](https://github.com/naaa-G/OACP/blob/main/CONTRIBUTING.md) and the [development guide](./development.md).

**Good first contributions:**

- Documentation fixes and examples
- Playground UI polish
- Schema edge-case tests
- Integration adapter improvements

Label: [`good first issue`](https://github.com/naaa-G/OACP/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) on GitHub (maintainers apply as issues are triaged).

## Maintainer triage (internal)

| Priority | Examples                                             | Target                |
| -------- | ---------------------------------------------------- | --------------------- |
| P0       | Security, data loss, CI broken on `main`             | Same day              |
| P1       | `oacp run` or playground broken on supported Node 20 | 48h                   |
| P2       | SDK/API bugs with workaround                         | Next patch            |
| P3       | Enhancements, docs                                   | Roadmap / discussions |

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](https://github.com/naaa-G/OACP/blob/main/CODE_OF_CONDUCT.md).

## Related

- [Community & support](./community.md)
