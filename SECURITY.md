# Security Policy

## Supported versions

| Version | Supported                                            |
| ------- | ---------------------------------------------------- |
| `0.1.x` | ✅ Active development (alpha — not production-ready) |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use [GitHub Private Security Advisories](https://github.com/naaa-G/OACP/security/advisories/new)
for responsible disclosure. If you cannot use that form, open a
[private security contact request](https://github.com/naaa-G/OACP/security/policy) via the
repository security tab.

Include:

- Description of the vulnerability
- Steps to reproduce
- Affected components (e.g. `@oacp/core`, reference server)
- Potential impact assessment
- Suggested fix (if any)

We aim to acknowledge reports within **3 business days** and provide an initial assessment
within **7 business days**.

## Disclosure process

1. Reporter submits vulnerability details privately.
2. Maintainers confirm and assign severity.
3. Fix is developed on a private branch when warranted.
4. Coordinated disclosure after a patch is available.

## Security model (overview)

OACP's security design covers:

- **Agent identity** — cryptographic identity and capability declarations
- **Message integrity** — signed messages (planned)
- **Permissions** — scoped agent permissions (planned)
- **Sandboxing** — execution isolation for untrusted agents (planned)

Detailed design: [docs/security-model.md](./docs/security-model.md).

## Safe usage during alpha

OACP `v0.1` is **experimental**. Do not expose reference servers to the public internet
without additional hardening. Treat all agent inputs as untrusted.
