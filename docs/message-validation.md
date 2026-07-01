# Message Validation

OACP messages are validated against canonical JSON Schemas in `specs/messages/` using
**AJV 2020-12** in `@oacp/core`. Validation enforces:

1. **Structure** — payload must be a JSON object
2. **Protocol version** — `version` must be in the supported set (`1.0`, read-compat `0.1`)
3. **Message type** — `type` must be a known Day 2 core type
4. **Schema conformance** — all required fields and formats (UUID, date-time, etc.)

## Quick start

```typescript
import { validateMessage, parseMessage, validateMessageType } from '@oacp/core';

// Auto-detect type from the `type` field
const outcome = validateMessage(incomingJson);
if (outcome.valid) {
  console.log(outcome.data.trace_id);
}

// Parse or throw
const message = parseMessage(incomingJson);

// Enforce a specific type (e.g. on an HTTP handler route)
const task = parseMessageType(incomingJson, 'task_request');
```

## `MessageValidator` class

For custom configuration (e.g. pinning versions in enterprise deployments):

```typescript
import { MessageValidator, SUPPORTED_PROTOCOL_VERSIONS } from '@oacp/core';

const validator = new MessageValidator({
  supportedVersions: SUPPORTED_PROTOCOL_VERSIONS,
});

const result = validator.validateType(payload, 'delegation');
```

## Supported message types (`v0.1`)

| Type               | Function                                        |
| ------------------ | ----------------------------------------------- |
| `task_request`     | `validateMessageType(data, 'task_request')`     |
| `task_response`    | `validateMessageType(data, 'task_response')`    |
| `delegation`       | `validateMessageType(data, 'delegation')`       |
| `capability_query` | `validateMessageType(data, 'capability_query')` |

## Error codes

| Code                           | When                                                |
| ------------------------------ | --------------------------------------------------- |
| `INVALID_MESSAGE_STRUCTURE`    | Payload is not a JSON object                        |
| `UNKNOWN_MESSAGE_TYPE`         | `type` is missing or not a core message type        |
| `UNSUPPORTED_PROTOCOL_VERSION` | `version` is not in the supported set               |
| `MESSAGE_TYPE_MISMATCH`        | `validateMessageType` expected a different `type`   |
| `SCHEMA_VALIDATION_FAILED`     | JSON Schema validation failed (see `error.details`) |

All errors are thrown as `OacpValidationError` with a machine-readable `code` and
`details[]` array (`path`, `message`).

```typescript
import { OacpValidationError, VALIDATION_ERROR_CODES } from '@oacp/core';

try {
  parseMessage(badPayload);
} catch (error) {
  if (error instanceof OacpValidationError) {
    console.error(error.code, error.details);
  }
}
```

## TypeScript types

Validated messages map to typed interfaces:

- `TaskRequestMessage`
- `TaskResponseMessage`
- `DelegationMessage`
- `CapabilityQueryMessage`

Union: `OacpMessage`. Type guards: `isTaskRequestMessage()`, `isTaskResponseMessage()`, etc.

## Schema composition

Message schemas in `specs/messages/` use JSON Schema 2020-12 `allOf` to merge the shared
envelope (`messageEnvelope`) with type-specific fields. Strictness is enforced with
`unevaluatedProperties: false` at the schema root (requires `type: "object"` for AJV
strict mode). Do **not** add `additionalProperties: false` on individual `allOf`
branches — that would incorrectly reject envelope fields defined in sibling branches.

## Examples as fixtures

Valid examples in [`specs/examples/`](../specs/examples/) are used as test fixtures and
should always pass validation:

```bash
pnpm --filter @oacp/core test
```

## Related

- [Message types](./message-types.md) — field reference
- [Protocol specification](./protocol-spec.md) — versioning policy
- [Agent identity](./agent-identity.md) — identity validation (Day 3)
