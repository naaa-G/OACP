# Security Model

> **Status:** Identity validation and permissions complete (Day 3). Message signing planned.

## Goals

1. **Authenticity** — verify message sender identity.
2. **Integrity** — detect tampered messages.
3. **Authorization** — enforce capability-scoped permissions.
4. **Isolation** — sandbox untrusted agent execution where required.

## Agent identity ✅ (Day 3)

Each agent declares a validated identity record:

```typescript
interface AgentIdentity {
  id: string; // agent://summarizer
  name: string;
  capabilities: string[];
  publicKey: string | JsonWebKey; // PEM or JWK
  version: '1.0';
}
```

- Schema: [`specs/agent/identity.schema.json`](../specs/agent/identity.schema.json)
- Validation: `validateAgentIdentity()` / `parseAgentIdentity()` in `@oacp/core`
- Docs: [agent-identity.md](./agent-identity.md)

## Permissions ✅ (Day 3)

Scoped permissions limit what an agent may do:

| Scope              | Field              | Purpose                         |
| ------------------ | ------------------ | ------------------------------- |
| Invoke             | `invoke[]`         | Capabilities callable on others |
| Delegate           | `delegate[]`       | Capabilities delegatable        |
| Memory             | `memory_scopes[]`  | Readable/writable memory scopes |
| Delegation targets | `allowed_agents[]` | Optional agent allow-list       |

Schema: [`specs/agent/permissions.schema.json`](../specs/agent/permissions.schema.json)

Helpers: `canInvoke()`, `canDelegate()`, `assertCanInvoke()`, `assertCanDelegate()`

## HTTP API authentication ✅ (Day 52)

Optional shared-secret auth protects observability and mutating routes when `OACP_API_KEY` is set.

| Credential                    | Usage                                       |
| ----------------------------- | ------------------------------------------- |
| `Authorization: Bearer <key>` | Preferred for HTTP clients and SDK          |
| `X-Api-Key: <key>`            | Alternative header                          |
| `?api_key=<key>`              | SSE only (`EventSource` cannot set headers) |

Public endpoints: `GET /health`, `GET /v1/observability/runtime-config`, Console static assets.

When `OACP_API_KEY` is unset, auth is disabled for local development.

See [production-deployment.md](./production-deployment.md) for Docker (`oacp-gateway` nginx), Console, and reverse-proxy guidance. Full OIDC/SSO is Phase 2.

## Observability SSE abuse controls ✅ (Day 55)

`GET /v1/observability/events` enforces a fixed limit of **10 concurrent SSE connections per client IP** (first `X-Forwarded-For` hop when present). Additional connections receive HTTP **429** with `RATE_LIMITED`.

Use `?api_key=` for authenticated SSE when `OACP_API_KEY` is configured. See [load-security-smoke.md](./load-security-smoke.md).

## Message signing (planned)

- Outbound messages signed with the agent's private key.
- Receivers verify signatures using `publicKey` from identity or registry.
- Implementation: `core/src/security/signature-verifier.ts` (Week 2+).

## Validation infrastructure ✅ (Day 3)

JSON Schema validation uses **AJV 2020-12** with shared `$defs` from `oacp.schema.json`.
Message envelope validation extends this in Day 4.

## Threat model (alpha)

During `v0.1` alpha:

- Run reference servers on private networks only.
- Treat all agent inputs as untrusted.
- Do not expose the playground to the public internet without a reverse proxy and auth.
- Validate all identity and capability records before registration.

## Reporting vulnerabilities

See [SECURITY.md](../SECURITY.md) for responsible disclosure.
