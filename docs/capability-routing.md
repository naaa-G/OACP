# Capability-Based Auto-Routing

OACP Week 2 Day 11 — send `task_request` messages **without** an explicit `to` agent URI.
The server resolves recipients from the capability index and returns routing metadata.

## How it works

```text
Client                          Server
  │  POST /send-message             │
  │  { capability: "code.debug" }   │  (no `to`)
  │ ───────────────────────────────►│
  │                                 │  1. Sync registry → bus enrollment
  │                                 │  2. Bus resolves by capability index
  │                                 │  3. Deliver to selected agent(s)
  │◄─────────────────────────────── │
  │  { recipients, routing: {...} } │
```

### Resolution order

1. **`to` set** → direct route to that agent (must be on the bus).
2. **`to` omitted** → capability auto-route:
   - Registry agents for that capability are enrolled on the bus (mailbox).
   - Bus picks recipients from the capability index.
   - **`first` mode** (default): lexicographically first agent URI.
   - **`all` mode**: every matching agent.

Configure server/bus mode via `OACP_CAPABILITY_ROUTING_MODE` (`first` | `all`).

## HTTP response metadata

Successful `POST /send-message` includes `routing`:

```json
{
  "ok": true,
  "message_id": "…",
  "trace_id": "…",
  "type": "task_request",
  "recipients": ["agent://debugger"],
  "routing": {
    "mode": "capability",
    "capability": "code.debug",
    "selected_agent": "agent://debugger",
    "routing_mode": "first"
  }
}
```

Direct sends return `{ "mode": "direct", "selected_agent": "agent://…" }`.

## SDK usage

`sendTask()` and `send()` work without `to` when a worker is on the server bus:

```typescript
import { AgentClient } from '@oacp/sdk';

const client = new AgentClient({ baseUrl: 'http://localhost:3847' });

await client.registerAgent({
  id: 'agent://coordinator',
  name: 'Coordinator',
  version: '1.0',
  capabilities: ['orchestrate'],
  publicKey: {
    /* JWK or PEM */
  },
});

const result = await client.sendTask({
  from: 'agent://coordinator',
  capability: 'code.debug',
  input: { file: 'main.ts' },
  // `to` omitted — server auto-routes
});

console.log(result.output);
```

Optional discovery-first (Day 10) remains valid when you need explicit agent choice:

```typescript
const workers = await client.findAgentsByCapability('code.debug');
await client.sendTask({ from: '…', capability: 'code.debug', to: workers[0]?.id, input: {} });
```

## Registration requirements

| Worker setup                       | Auto-route works? | Discovery works? |
| ---------------------------------- | :---------------: | :--------------: |
| `createAgentRuntime` on server bus |        ✅         |       ❌\*       |
| `POST /agents` only (mailbox pull) |        ✅         |        ✅        |
| Runtime + `POST /agents` (merge)   |        ✅         |        ✅        |

\*Unless also registered via `POST /agents`.

**Best practice:** register identity via `POST /agents`, then attach runtime handler.
Bus registration merges preserve existing `onTask` handlers.

## Local bus (same process)

The in-process bus uses the same rules — see [message-bus.md](./message-bus.md).

```typescript
import { createMessageBus } from '@oacp/core';

const bus = createMessageBus({ capabilityRoutingMode: 'first' });
bus.register('agent://debugger', handler, { capabilities: ['code.debug'] });

await bus.send({
  type: 'task_request',
  capability: 'code.debug',
  // no `to`
  /* …envelope fields… */
});
```

## Errors

| Code                       | When                                    |
| -------------------------- | --------------------------------------- |
| `SERVER_ROUTING_FAILED`    | No agent on bus declares the capability |
| `SERVER_VALIDATION_FAILED` | Invalid capability id in registry sync  |

## Related

- [Registry design](./registry-design.md) — capability discovery (Day 10)
- [HTTP server](./http-server.md) — `POST /send-message`
- [Remote client](./remote-client.md) — `AgentClient.sendTask()`
- [Message bus](./message-bus.md) — in-process routing rules
