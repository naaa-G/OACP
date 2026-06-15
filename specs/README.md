# OACP Protocol Specifications

This directory contains the **canonical JSON Schemas** for the Open Agent Collaboration
Protocol. Schemas are the **single source of truth** — all validators, SDKs, and servers
must conform to them.

## Layout

```text
specs/
├── oacp.schema.json          # Shared $defs + message envelope
├── messages/                 # Per-type message schemas (Day 2 ✅)
├── examples/                 # Valid example payloads
├── agent/                    # Agent identity (Day 3 ✅)
└── registry/                 # Agent registry records (Week 2)
```

## Version

- **Protocol:** `0.1` (alpha)
- **JSON Schema draft:** [2020-12](https://json-schema.org/draft/2020-12/schema)

## Status

| Schema group                         | Status  |
| ------------------------------------ | :-----: |
| `oacp.schema.json`                   | ✅ Done |
| `messages/` (Day 2 core types)       | ✅ Done |
| `examples/`                          | ✅ Done |
| `agent/`                             | ✅ Done |
| `registry/`                          | Week 2  |
| `memory_share`, `heartbeat` messages |  Later  |

## Day 2 message types

| Type               | Schema                                                               |
| ------------------ | -------------------------------------------------------------------- |
| `task_request`     | [`messages/task_request.json`](./messages/task_request.json)         |
| `task_response`    | [`messages/task_response.json`](./messages/task_response.json)       |
| `delegation`       | [`messages/delegation.json`](./messages/delegation.json)             |
| `capability_query` | [`messages/capability_query.json`](./messages/capability_query.json) |

## Day 3 agent schemas

| Schema         | File                                                                 |
| -------------- | -------------------------------------------------------------------- |
| Agent identity | [`agent/identity.schema.json`](./agent/identity.schema.json)         |
| Capabilities   | [`agent/capabilities.schema.json`](./agent/capabilities.schema.json) |
| Permissions    | [`agent/permissions.schema.json`](./agent/permissions.schema.json)   |

See [`agent/README.md`](./agent/README.md).

At build time, schemas are copied to `core/schemas/` so the protocol engine can load them
without depending on monorepo layout. **Edit schemas here in `specs/`** — never edit the
copy in `core/schemas/` directly.

## Contributing

Protocol changes require:

1. Schema update in this directory
2. Example payload in `examples/` (if applicable)
3. Tests in `core/tests/` (protocol + agent-identity)
4. Documentation in `docs/protocol-spec.md` and `docs/message-types.md`
5. Entry in `CHANGELOG.md`

See [CONTRIBUTING.md](../CONTRIBUTING.md).
