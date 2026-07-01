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
| `version`      |    ✅    | Protocol version (`"1.0"`)                   |
| `capabilities` |    ✅    | Capability IDs this agent performs (unique)  |
| `publicKey`    |    ✅    | PEM string or JWK for signature verification |
| `description`  |    —     | Optional description                         |
| `metadata`     |    —     | Optional opaque metadata (see below)         |

Example: [`specs/examples/agent-identity.example.json`](../specs/examples/agent-identity.example.json)

```typescript
import { parseAgentIdentity, validateAgentIdentity } from '@oacp/core';

const outcome = validateAgentIdentity(identityJson);
if (outcome.valid) {
  console.log(outcome.data.capabilities);
}

const identity = parseAgentIdentity(identityJson); // throws on invalid
```

## Observability metadata (Day 9+)

The Console snapshot API surfaces selected `metadata` keys as top-level agent fields for fleet catalog rendering. Registration is unchanged — only the snapshot response is enriched.

| Metadata key | Snapshot field | Description                                                                 |
| ------------ | -------------- | --------------------------------------------------------------------------- |
| `fleet`      | `fleet`        | Logical fleet or deployment group (e.g. `mcplab`, `startup-demo`, `system`) |
| `role`       | `role`         | Agent role within a fleet (e.g. `planner`, `coordinator`, `worker`)         |

**Console catalog buckets (Day 17):** known fleets render under matching section headers. Any other value (or missing `fleet`) is grouped under **External** while still displaying the raw fleet badge when present. See [console.md](./console.md#fleet-grouping-day-17).

**Role resolution (Day 18):** the Console resolves display roles in order: explicit `role` metadata → URI/name tokens → capability prefix. Inferred roles show `data-role-source` on the role badge. See [console.md](./console.md#role-taxonomy-day-18).

Example registration:

```json
{
  "id": "agent://mcplab-planner",
  "name": "MCPLab Planner",
  "version": "1.0",
  "capabilities": ["plan"],
  "publicKey": { "kty": "OKP", "crv": "Ed25519", "x": "…" },
  "metadata": {
    "fleet": "mcplab",
    "role": "planner"
  }
}
```

The server also derives:

| Field          | Source                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`       | `active` when the agent appears in the selected trace roster or timeline; `error` when it emitted a failed `task_response`; otherwise `idle` |
| `last_seen_at` | Latest `lastActivityAt` across trace listings, refined by `active_trace.timeline` timestamps                                                 |

See [console-spec.md](./console-spec.md) for the full `AgentObservabilityRecord` schema.

See [mcplab-integration.md](./mcplab-integration.md) for MCPLab fleet/role registration and role taxonomy.

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
