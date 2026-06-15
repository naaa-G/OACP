# Agent Identity & Capabilities

OACP agents are identified by a canonical **identity record**, publish **capability
declarations** describing what they can do, and optionally declare **permissions** governing
what they may invoke or delegate.

## Agent identity

Every agent has a stable identity defined in [`specs/agent/identity.schema.json`](../specs/agent/identity.schema.json):

| Field          | Required | Description                                  |
| -------------- | :------: | -------------------------------------------- |
| `id`           |    ✅    | Stable URI (`agent://summarizer`)            |
| `name`         |    ✅    | Human-readable name                          |
| `version`      |    ✅    | Protocol version (`"0.1"`)                   |
| `capabilities` |    ✅    | Capability IDs this agent performs (unique)  |
| `publicKey`    |    ✅    | PEM string or JWK for signature verification |
| `description`  |    —     | Optional description                         |
| `metadata`     |    —     | Optional opaque metadata                     |

Example: [`specs/examples/agent-identity.example.json`](../specs/examples/agent-identity.example.json)

```typescript
import { parseAgentIdentity, validateAgentIdentity } from '@oacp/core';

const outcome = validateAgentIdentity(identityJson);
if (outcome.valid) {
  console.log(outcome.data.capabilities);
}

const identity = parseAgentIdentity(identityJson); // throws on invalid
```

## Capability declarations

Rich capability metadata lives in [`specs/agent/capabilities.schema.json`](../specs/agent/capabilities.schema.json).

Each **declaration** describes one capability:

| Field          | Required | Description                           |
| -------------- | :------: | ------------------------------------- |
| `id`           |    ✅    | Capability ID (matches identity list) |
| `name`         |    ✅    | Human-readable name                   |
| `description`  |    ✅    | What the capability does              |
| `version`      |    —     | Semver of this implementation         |
| `tags`         |    —     | Discovery tags                        |
| `inputSchema`  |    —     | Optional JSON Schema for task input   |
| `outputSchema` |    —     | Optional JSON Schema for task output  |

Agents publish a **capability registry** bundle (`agent_id`, `version`, `declarations[]`).

```typescript
import { buildCapabilityCatalog, CapabilityCatalog, parseCapabilityRegistry } from '@oacp/core';

const registry = parseCapabilityRegistry(registryJson);
const catalog = buildCapabilityCatalog(identity, registry);

catalog.has('text.summarize'); // true
catalog.list(); // CapabilityDeclaration[]
```

### Consistency rule

The `capabilities[]` array on the identity **must match exactly** the declaration IDs in the
registry. Mismatches throw `IDENTITY_CAPABILITY_MISMATCH`.

## Permissions

Scoped permissions in [`specs/agent/permissions.schema.json`](../specs/agent/permissions.schema.json):

| Field            | Description                                |
| ---------------- | ------------------------------------------ |
| `invoke`         | Capabilities this agent may call on others |
| `delegate`       | Capabilities this agent may delegate       |
| `memory_scopes`  | Memory scopes the agent may access         |
| `allowed_agents` | Optional allow-list for delegation targets |

```typescript
import { canInvoke, canDelegate, assertCanInvoke } from '@oacp/core';

assertCanInvoke(permissions, 'text.summarize');
canDelegate(permissions, 'code.generate', 'agent://developer');
```

## Validation

Identity, capability, and permission records are validated against JSON Schemas using
AJV (2020-12) in `@oacp/core`. Message validation (Day 4) reuses the same validator
infrastructure.

### Error codes

| Code                           | Meaning                                       |
| ------------------------------ | --------------------------------------------- |
| `SCHEMA_VALIDATION_FAILED`     | Record failed JSON Schema validation          |
| `IDENTITY_CAPABILITY_MISMATCH` | Identity capabilities ≠ registry declarations |
| `DUPLICATE_CAPABILITY`         | Capability registered twice                   |
| `PERMISSION_DENIED`            | Action not allowed by permissions             |

## Public key formats

Supported `publicKey` formats:

1. **PEM** — string starting with `-----BEGIN PUBLIC KEY-----`
2. **JWK** — JSON Web Key object with required `kty` field

Message signing and verification land in Week 2+ (`core/src/security/`).

## Related docs

- [Agent lifecycle](./agent-lifecycle.md)
- [Security model](./security-model.md)
- [Message types](./message-types.md)
- [Protocol specification](./protocol-spec.md)
