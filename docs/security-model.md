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
  version: '0.1';
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
