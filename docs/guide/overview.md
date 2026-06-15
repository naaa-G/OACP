# Documentation overview

Welcome to the **Open Agent Collaboration Protocol (OACP)** documentation.

Use the sidebar to browse guides, or start with [What is OACP?](/what-is-oacp) and the [Quick start](/quick-start).

## Start here

| Document                             | Description                             |
| ------------------------------------ | --------------------------------------- |
| [Quick start](/quick-start)          | Get a result in under 5 minutes         |
| [What is OACP?](/what-is-oacp)       | Positioning, architecture, and diagrams |
| [Development guide](/development)    | Local setup, scripts, and workflow      |
| [Architecture](/architecture)        | System layers and package boundaries    |
| [CLI](/cli)                          | `oacp run` / trace / serve (Day 24)     |
| [TypeScript SDK](/sdk-typescript)    | `@oacp/sdk` and `@oacp/sdk/client`      |
| [Python SDK](/sdk-python)            | `oacp-sdk` async HTTP client            |
| [Example gallery](/examples-gallery) | Coding, research, bug-finder swarms     |
| [Integrations](/integrations)        | LangChain & AutoGen adapters (Day 28)   |
| [Startup team](/startup-team)        | Flagship autonomous team demo           |
| [Playground](/playground)            | Live agent graph UI                     |

## Protocol & runtime

| Document                                  | Description                           |
| ----------------------------------------- | ------------------------------------- |
| [Protocol specification](/protocol-spec)  | Protocol overview and versioning      |
| [Message types](/message-types)           | Core message envelopes (`v0.1`)       |
| [Message validation](/message-validation) | JSON Schema validation API            |
| [Agent identity](/agent-identity)         | Identity, capabilities, permissions   |
| [Message bus](/message-bus)               | In-process routing and trace tracking |
| [Agent runtime](/agent-runtime)           | `sendTask`, `receiveTask`, lifecycle  |
| [Security model](/security-model)         | Identity, signatures, permissions     |
| [Agent lifecycle](/agent-lifecycle)       | Registration, execution, shutdown     |

## Networking & orchestration

| Document                                        | Description                     |
| ----------------------------------------------- | ------------------------------- |
| [HTTP server](/http-server)                     | Reference server API            |
| [Remote client](/remote-client)                 | `AgentClient` HTTP transport    |
| [TypeScript SDK](/sdk-typescript)               | `@oacp/sdk` package guide       |
| [Python SDK](/sdk-python)                       | `oacp-sdk` async client         |
| [Registry design](/registry-design)             | Capability discovery API        |
| [Capability routing](/capability-routing)       | Auto-route by capability        |
| [Reliable delivery](/reliable-delivery)         | Retries and delivery guarantees |
| [Multi-agent pipeline](/multi-agent-pipeline)   | A → B → C chains                |
| [Memory system](/memory-system)                 | Shared memory and task history  |
| [Delegation graph](/delegation-graph)           | Who delegated what              |
| [Subtask decomposition](/subtask-decomposition) | Multi-step plans and delegation |
| [Workflow engine](/workflow-engine)             | DAG workflow execution          |
| [Failure recovery](/failure-recovery)           | Failover and alternate agents   |
| [Observability](/observability)                 | Logging and trace viewer        |

## Demos & examples

| Document                                               | Description                 |
| ------------------------------------------------------ | --------------------------- |
| [Demo v1](/demo-v1)                                    | Network collaboration demo  |
| [Demo v2](/demo-v2)                                    | Structured task chain demo  |
| [Integration testing](/integration-testing)            | Multi-agent milestone tests |
| [Basic agent flow](/examples/basic-agent-flow)         | In-process hello agents     |
| [Multi-agent task](/examples/multi-agent-task)         | Pipeline planning doc       |
| [Autonomous team demo](/examples/autonomous-team-demo) | Startup team pointer        |

## External links

- [GitHub repository](https://github.com/naaa-G/OACP) — source code
- [README roadmap](https://github.com/naaa-G/OACP#-roadmap) — milestones
- [CONTRIBUTING](https://github.com/naaa-G/OACP/blob/main/CONTRIBUTING.md) — how to contribute
