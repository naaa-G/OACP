# Message Bus (In-Process)

The in-memory message bus routes OACP messages between agents in a single Node.js process.
It validates on send, resolves recipients by agent URI or capability, and indexes every
message by `trace_id` for distributed correlation.

**Module:** `core/src/routing/` · **Package:** `@oacp/core`

## Quick start

```typescript
import { createMessageBus } from '@oacp/core';
import type { TaskRequestMessage } from '@oacp/core';

const bus = createMessageBus();

// Worker agent — capability-based routing
bus.register(
  'agent://summarizer',
  async (message, context) => {
    console.log('task received', message.trace_id, context.deliveredAt);
  },
  { capabilities: ['text.summarize'] },
);

// Coordinator — receives task_response via in_reply_to routing
bus.register('agent://coordinator', async (message) => {
  if (message.type === 'task_response') {
    console.log('result', message.output);
  }
});

const request: TaskRequestMessage = {
  type: 'task_request',
  version: '0.1',
  message_id: crypto.randomUUID(),
  trace_id: crypto.randomUUID(),
  from: 'agent://coordinator',
  timestamp: new Date().toISOString(),
  capability: 'text.summarize',
  input: { text: 'Hello agents' },
};

const outcome = await bus.send(request);
if (outcome.ok) {
  console.log('delivered to', outcome.recipients);
}
```

## Registration modes

### Push (handler callback)

Messages arrive via an async handler — the primary pattern for agent runtimes:

```typescript
bus.register('agent://worker', async (message, context) => {
  // context.bus exposes trace lookup for nested delegation
  const trace = context.bus.getTrace(context.traceId);
});
```

### Pull (mailbox)

For tests or simple scripts, queue messages and receive them explicitly:

```typescript
bus.register('agent://worker', undefined, {
  capabilities: ['text.summarize'],
  useMailbox: true,
});

await bus.send(request);
const message = await bus.waitForMessage('agent://worker', 5_000);
```

## Routing rules

| Message type       | Resolution                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `task_request`     | `to` if set → direct agent; else → first agent with matching `capability` (sorted by URI, Day 11) |
| `delegation`       | Same as `task_request`                                                                            |
| `task_response`    | `in_reply_to` → original message's `from` agent                                                   |
| `capability_query` | `agent://registry` if registered; else first agent with queried capability                        |

Configure capability routing mode and registry URI:

```typescript
const bus = createMessageBus({
  capabilityRoutingMode: 'first', // or 'all'
  registryAgentUri: 'agent://registry',
});
```

## Trace tracking

Every message sent through the bus is indexed by `trace_id` and `message_id`:

```typescript
const trace = bus.getTrace(traceId);
console.log(trace?.messageCount, trace?.messages);

const original = bus.getMessageById(inReplyTo);
```

Use traces for observability, reply routing, and the Week 3 delegation graph.

## Send outcomes

`send()` and `sendRaw()` return a discriminated union — never throw on validation or routing failure:

```typescript
import { ROUTING_ERROR_CODES, VALIDATION_ERROR_CODES } from '@oacp/core';

const outcome = await bus.send(message);
if (!outcome.ok) {
  switch (outcome.error.code) {
    case VALIDATION_ERROR_CODES.SCHEMA_VALIDATION_FAILED:
      // invalid payload
      break;
    case ROUTING_ERROR_CODES.NO_RECIPIENT:
      // no agent for capability
      break;
  }
}
```

| Code                           | When                                      |
| ------------------------------ | ----------------------------------------- |
| `ROUTING_NO_RECIPIENT`         | No agent matches capability / in_reply_to |
| `ROUTING_AGENT_NOT_REGISTERED` | Direct `to` agent not on the bus          |
| `ROUTING_DELIVERY_FAILED`      | Handler threw for all recipients          |
| `ROUTING_BUS_CLOSED`           | `bus.close()` was called                  |

## Delivery guarantees

The local bus uses **at-most-once** delivery (`LOCAL_BUS_DELIVERY_GUARANTEE`). Remote
`AgentClient` uses **at-least-once** delivery with retries — see [reliable-delivery.md](./reliable-delivery.md).

## Lifecycle

```typescript
bus.getStats(); // registeredAgents, traceCount, isOpen, ...
bus.close(); // reject new sends
bus.openBus(); // re-enable
bus.unregister('agent://worker');
```

## Related

- [Message validation](./message-validation.md) — schema validation before routing
- [Agent lifecycle](./agent-lifecycle.md) — registration and execution (Day 6)
- [Architecture](./architecture.md) — routing layer in the monorepo
