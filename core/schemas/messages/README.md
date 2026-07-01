# OACP Message Schemas (`v1.0`)

Canonical JSON Schemas for OACP message types. All schemas use **JSON Schema draft 2020-12**
and compose shared definitions from [`../oacp.schema.json`](../oacp.schema.json).

## Day 2 message types

| Schema             | File                                               | Purpose                                    |
| ------------------ | -------------------------------------------------- | ------------------------------------------ |
| `task_request`     | [`task_request.json`](./task_request.json)         | Request work by capability or direct agent |
| `task_response`    | [`task_response.json`](./task_response.json)       | Return task output or structured error     |
| `delegation`       | [`delegation.json`](./delegation.json)             | Delegate a subtask to another agent        |
| `capability_query` | [`capability_query.json`](./capability_query.json) | Discover agents by capability              |

## Planned (later milestones)

| Schema         | Target |
| -------------- | ------ |
| `memory_share` | Week 3 |
| `heartbeat`    | Week 2 |

## Examples

Valid example payloads live in [`../examples/`](../examples/).

## Validation

Runtime validation is implemented in `@oacp/core` (Day 4). Until then, use any
JSON Schema 2020-12 validator with these files.

## `$id` URLs

Schemas use stable `$id` URLs under `https://oacp.dev/schemas/v1.0/`. Relative `$ref`
paths resolve correctly when validating from the repository filesystem.
