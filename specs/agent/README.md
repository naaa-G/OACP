# OACP Agent Schemas (`v0.1`)

Canonical JSON Schemas for agent identity, capability declarations, and permissions.

## Schemas

| Schema         | File                                                     | Purpose                                                       |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| Agent identity | [`identity.schema.json`](./identity.schema.json)         | Core agent record (`id`, `name`, `capabilities`, `publicKey`) |
| Capabilities   | [`capabilities.schema.json`](./capabilities.schema.json) | Single declaration + registry bundle (`$defs`)                |
| Permissions    | [`permissions.schema.json`](./permissions.schema.json)   | Scoped invoke/delegate/memory permissions                     |

## Examples

| Example             | File                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Agent identity      | [`../examples/agent-identity.example.json`](../examples/agent-identity.example.json)           |
| Capability registry | [`../examples/capability-registry.example.json`](../examples/capability-registry.example.json) |
| Agent permissions   | [`../examples/agent-permissions.example.json`](../examples/agent-permissions.example.json)     |

## Validation (`@oacp/core`)

```typescript
import {
  validateAgentIdentity,
  validateCapabilityRegistry,
  validateAgentPermissions,
} from '@oacp/core';
```

See [docs/agent-identity.md](../../docs/agent-identity.md).
