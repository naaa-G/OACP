# Integration Testing

Week 1 ends with **first working multi-agent communication** — verified by integration
tests that exercise the full stack in a single Node.js process.

## Milestone scope (Day 7)

```text
Coordinator (Agent A)  ──task_request──►  Summarizer (Agent B)
                       ◄─task_response──
```

Validates:

- Protocol schemas (`specs/`)
- Message validation (`@oacp/core` protocol layer)
- In-memory routing and `trace_id` tracking (Day 5)
- Agent runtime `sendTask` / `receiveTask` / `respond` (Day 6)
- SDK `Agent` + `LocalBus` ergonomics

## Test locations

| Suite                  | Path                                                     | Focus                                  |
| ---------------------- | -------------------------------------------------------- | -------------------------------------- |
| Core E2E               | `core/tests/integration/multi-agent.test.ts`             | `AgentRuntime` + `InMemoryMessageBus`  |
| SDK E2E                | `sdk/typescript/tests/multi-agent.integration.test.ts`   | `Agent` + `LocalBus`                   |
| MCPLab full-loop       | `server/tests/mcplab-full-loop.test.ts`                  | Console URL + v1 snapshot (Day 15)     |
| Day 55 smoke           | `server/tests/day55-*.test.ts`                           | Snapshot p95, sync backfill, SSE, auth |
| MCPLab live (optional) | `sdk/python/tests/integration/test_full_loop.py`         | Against `MCPLAB_OACP_SERVER_URL`       |
| Unit coverage          | `core/tests/*.test.ts`, `sdk/typescript/tests/*.test.ts` | Layer-specific behaviour               |

## Run integration tests

```bash
# All tests (includes integration)
pnpm test

# Core milestone only
pnpm --filter @oacp/core test -- tests/integration

# SDK milestone only
pnpm --filter @oacp/sdk test -- multi-agent.integration
```

CI runs `pnpm verify`, which executes the full test suite.

## Scenarios covered

| Scenario            | Assertion                                        |
| ------------------- | ------------------------------------------------ |
| Capability routing  | Coordinator omits `to`; bus routes to summarizer |
| Direct routing      | `to: agent://summarizer` on `task_request`       |
| Manual flow         | `receiveTask` + `respond` without auto-handler   |
| Error propagation   | Worker returns structured `task_response` error  |
| Trace observability | Bus records 2 messages per `trace_id`            |
| Protocol validity   | Every trace message passes `validateMessage()`   |
| Bus isolation       | Agents on separate buses cannot communicate      |

## Helpers

`core/tests/integration/helpers.ts` provides:

- `loadSummarizerIdentity()` — canonical identity fixture
- `createCoordinatorIdentity()` — coordinator agent URI
- `assertTraceMessagesValid()` — schema validation over a trace
- `assertTaskCorrelation()` — `in_reply_to` / `trace_id` / `from` checks

## Runnable example

See [`examples/multi-agent/hello-agents.ts`](../examples/multi-agent/hello-agents.ts) for a
copy-paste script mirroring the milestone flow.

## MCPLab full-loop (Day 15)

See [docs/mcplab-full-loop.md](../../docs/mcplab-full-loop.md) for the end-to-end MCPLab × Console verification workflow.

```bash
pnpm --filter @oacp/server test -- mcplab-full-loop
cd sdk/python && pytest tests/test_observability.py tests/test_mcplab_trace_url.py -v
```

## Day 55 load + security smoke

See [load-security-smoke.md](./load-security-smoke.md).

```bash
pnpm test:day55
pnpm test:day55:live   # + live security audits when stacks are running
```

## Day 56 demo rehearsal

See [demo-scripts.md](./demo-scripts.md).

```bash
pnpm demo:rehearse
pnpm --filter @oacp/server test -- demo-rehearsal
```

## Related

- [Agent runtime](./agent-runtime.md)
- [Message bus](./message-bus.md)
- [Development guide](./development.md)
