# @oacp/core

OACP protocol engine — validation, routing, runtime, security, and memory primitives.

## Status

**Alpha (`0.1.0`)** — Day 4 complete. Full message validation (`validateMessage`, `MessageValidator`).
Agent identity and permissions validation included from Day 3.

## Install

This package is part of the OACP monorepo. External consumption will be available once
published to npm.

```bash
pnpm add @oacp/core
```

## Usage

```typescript
import {
  PROTOCOL_VERSION,
  PACKAGE_VERSION,
  parseMessage,
  parseMessageType,
  parseAgentIdentity,
} from '@oacp/core';

const task = parseMessageType(payload, 'task_request');
const identity = parseAgentIdentity(identityJson);
```

## Development

```bash
pnpm --filter @oacp/core build
pnpm --filter @oacp/core test
```

## License

Apache-2.0 — see [LICENSE](../LICENSE).
