# Registry Design

> **Status:** In-memory registry with capability index on `@oacp/server` (Day 8 + Day 10).

## Purpose

The agent registry maps **capabilities → agents**, enabling discovery without hard-coded agent IDs.
Remote coordinators query the registry, then send `task_request` messages to a chosen agent.

## Query flow

```text
  Coordinator (remote)          Registry (server)              Worker
     │  GET /capabilities/          │                           │
     │  text.summarize/agents       │                           │
     │ ────────────────────────────►│                           │
     │◄──────────────────────────── │                           │
     │  [agent://summarizer]        │                           │
     │  POST /send-message          │                           │
     │  task_request (to=summarizer)│                           │
     │ ────────────────────────────►│ InMemoryMessageBus        │
     │                              │ ─────────────────────────►│
     │  GET /agent/:id/messages     │◄── task_response ─────────│
     │ ◄────────────────────────────│                           │
```

## Registration vs bus enrollment

| Step                   | Registry | Message bus |
| ---------------------- | :------: | :---------: |
| `POST /agents`         |    ✅    |     ✅      |
| `createAgentRuntime`   |    —     |     ✅      |
| `AgentClient.register` |    ✅    |     ✅      |

Agents must be registered via `POST /agents` (or `AgentClient.registerAgent`) to appear in
capability discovery. Runtime-only enrollment on the bus is not indexed for HTTP discovery.

**Order matters:** register identity first, then attach a runtime handler so `POST /agents`
does not overwrite an active `onTask` handler.

## Capability index

`AgentRegistry` maintains an in-memory index:

- **Key:** capability id (e.g. `text.summarize`)
- **Value:** set of agent URIs declaring that capability
- **Lookup:** deterministic sort by agent id; optional `limit` (1–100, default 10)
- **Updates:** index rebuilt on register, replace, and unregister

Capability ids must match `specs/oacp.schema.json#/$defs/capability`:

```text
^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*$
```

## HTTP discovery API (Day 10)

| Method | Path                               | Description                         |
| ------ | ---------------------------------- | ----------------------------------- |
| `GET`  | `/capabilities/:capability/agents` | Discover agents by capability       |
| `GET`  | `/agents?capability=&limit=`       | Filtered list (same response shape) |

**Success (200):**

```json
{
  "ok": true,
  "capability": "text.summarize",
  "count": 1,
  "agents": [{ "id": "agent://summarizer", "capabilities": ["text.summarize"], "...": "..." }]
}
```

Empty results return `count: 0` and `agents: []` (not 404).

## SDK

```typescript
import { AgentClient } from '@oacp/sdk';

const client = new AgentClient({ baseUrl: 'http://localhost:3847' });

const agents = await client.findAgentsByCapability('text.summarize', { limit: 5 });
// or
const filtered = await client.listAgents({ capability: 'text.summarize' });
```

See [remote-client.md](./remote-client.md) and [http-server.md](./http-server.md).

## Schema (future public registry)

Planned for post-M4:

- `specs/registry/agent_record.schema.json` — stored agent metadata
- `specs/registry/discovery_query.schema.json` — search/filter queries

## Implementations

| Layer           | Path                                    | Scope   |
| --------------- | --------------------------------------- | ------- |
| In-memory       | `server/src/registry/agent-registry.ts` | Week 2  |
| Public registry | `registry/`                             | Post-M4 |

## Ranking & verification (future)

The public registry (`registry/`) may add search ranking and agent verification. Not in
scope for Week 1–2.

See [README roadmap](https://github.com/naaa-G/OACP#-roadmap) Milestone M2.
