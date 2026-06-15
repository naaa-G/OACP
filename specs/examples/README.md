# OACP Protocol Examples

Valid example payloads for OACP `v0.1`. These are **not** JSON Schemas — they are sample
documents that conform to schemas in [`../messages/`](../messages/) and [`../agent/`](../agent/).

## Message examples (Day 2)

| Example                                                                      | Schema                    |
| ---------------------------------------------------------------------------- | ------------------------- |
| [`task_request.example.json`](./task_request.example.json)                   | `task_request`            |
| [`task_response.success.example.json`](./task_response.success.example.json) | `task_response` (success) |
| [`task_response.error.example.json`](./task_response.error.example.json)     | `task_response` (error)   |
| [`delegation.example.json`](./delegation.example.json)                       | `delegation`              |
| [`capability_query.example.json`](./capability_query.example.json)           | `capability_query`        |

## Agent examples (Day 3)

| Example                                                                  | Schema              |
| ------------------------------------------------------------------------ | ------------------- |
| [`agent-identity.example.json`](./agent-identity.example.json)           | Agent identity      |
| [`capability-registry.example.json`](./capability-registry.example.json) | Capability registry |
| [`agent-permissions.example.json`](./agent-permissions.example.json)     | Agent permissions   |

Use these for documentation, manual testing, and validator fixtures.
