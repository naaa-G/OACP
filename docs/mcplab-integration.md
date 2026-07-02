# MCPLab × OACP integration

MCPLab is the flagship OACP demo: MCP tools plus multi-agent orchestration. The **OACP Console** surfaces MCPLab crews with fleet/role badges, live traces, and delegation graphs.

> **MCPLab repo:** [github.com/naaa-G/MCPLab](https://github.com/naaa-G/MCPLab) — keep aligned with `MCPLab/docs/oacp-integration.md`.

## Agent registration contract (Day 11)

Every MCPLab agent **must** register with observability metadata:

```json
{
  "id": "agent://mcplab-planner-crew-demo",
  "name": "Planner (crew demo)",
  "version": "1.0",
  "capabilities": ["plan"],
  "publicKey": { "kty": "OKP", "crv": "Ed25519", "x": "…" },
  "metadata": {
    "fleet": "mcplab",
    "role": "planner"
  }
}
```

| Field                        | Value              | Purpose                                              |
| ---------------------------- | ------------------ | ---------------------------------------------------- |
| `metadata.fleet`             | `"mcplab"`         | Console fleet badge (cyan `--oacp-fleet-mcplab`)     |
| `metadata.role`              | See taxonomy below | Console role pill + search/filter                    |
| `metadata.config_url`        | —                  | Optional MCPLab lab config deep link (Day 21 drawer) |
| `metadata.mcplab_config_url` | —                  | Alias for `config_url`                               |

### URI convention

Use the `agent://mcplab-…` namespace:

```text
agent://mcplab-<role>-crew-demo
agent://mcplab-integration-client
agent://mcplab-<specialty>-<name>
```

Explicit metadata is **preferred**. The OACP server also infers `fleet` + `role` for `agent://mcplab-*` URIs when metadata is missing (backward compatibility for older Docker images).

Inference logic: `@oacp/core` → `resolveAgentObservabilityTaxonomy()`.

## Role taxonomy

| Role          | Typical agents                   | Notes                            |
| ------------- | -------------------------------- | -------------------------------- |
| `coordinator` | Product manager, orchestrator    | Delegates work, owns trace       |
| `planner`     | Planner crew demo                | Breaks goals into tasks          |
| `researcher`  | Researcher crew demo             | Gathers context / sources        |
| `synthesizer` | Synthesizer crew demo            | Merges research into narrative   |
| `publisher`   | Publisher crew demo              | Formats output for delivery      |
| `deliverer`   | Delivery / handoff agents        | Ships artifacts to consumers     |
| `coder`       | Backend developer, MCPLab coder  | Implementation / codegen         |
| `reviewer`    | QA engineer, code reviewer       | Validation / critique            |
| `ops`         | Ops crew demo                    | Runtime / infra operations       |
| `scanner`     | Security / dependency scanner    | Static analysis                  |
| `triager`     | Incident / issue triager         | Routes failures                  |
| `client`      | Integration client, demo client  | External entrypoint / hub        |
| `architect`   | System architect                 | Design / structure               |
| `designer`    | UX / solution designer           | Human-facing design              |
| `analyst`     | Data / business analyst          | Metrics / requirements           |
| `qa`          | Alias for quality-focused agents | Prefer `reviewer` for new agents |

Add new roles in `@oacp/core` `MCPLAB_ROLES` and update this table before launch.

## SDK helpers

### Python (`oacp_sdk`)

```python
from oacp_sdk import register_mcplab_agent, build_mcplab_metadata

await register_mcplab_agent(
    client,
    agent_id="agent://mcplab-planner-crew-demo",
    name="Planner (crew demo)",
    capabilities=["plan"],
    role="planner",
)

# Or attach metadata manually:
identity["metadata"] = build_mcplab_metadata("researcher")
```

### TypeScript (`@oacp/sdk`)

```typescript
import { registerMcplabAgent, buildMcplabAgentIdentity } from '@oacp/sdk';

await registerMcplabAgent(client, {
  id: 'agent://mcplab-researcher-crew-demo',
  name: 'Researcher (crew demo)',
  capabilities: ['research'],
  role: 'researcher',
});

const identity = buildMcplabAgentIdentity({
  id: 'agent://mcplab-publisher-crew-demo',
  name: 'Publisher',
  capabilities: ['publish'],
  role: 'publisher',
});
```

## Docker (v1 unified stack)

MCPLab is a **client** — it does **not** start its own OACP server. The platform and full lab stack use **two compose files** sharing `oacp-network`:

```bash
# OACP repo root — platform + full MCPLab lab
pnpm docker:mcplab

# Or manually:
docker compose up --build -d
docker compose -f MCPLab/docker-compose.yml up -d --build
```

| Stack         | Compose file                | Key ports                   | Role                       |
| ------------- | --------------------------- | --------------------------- | -------------------------- |
| OACP platform | `docker-compose.yml`        | `3847`                      | Platform API + Console     |
| MCPLab lab    | `MCPLab/docker-compose.yml` | `8001`, `3002`, `8082–8084` | Postgres, API, worker, web |

Remove any legacy MCPLab compose that bundled OACP on `:3001`. See [integrate/mcplab/MIGRATION.md](../integrate/mcplab/MIGRATION.md).

## Console verification

1. Start OACP unified stack (`docker compose up` on `:3847`) or local server (`pnpm --filter @oacp/server start`).
2. Run a crew trace.
3. In **Registered agents**:
   - MCPLab agents show **mcplab** fleet badge (cyan) and **role** pill once the OACP server includes Day 11 enrichment (rebuild Docker image or register with SDK metadata).
   - Search `planner` or `mcplab` in the agent search box.
4. Snapshot API:

```http
GET /v1/observability/snapshot
```

Each MCPLab agent should include `"fleet": "mcplab"` and `"role": "<role>"` in `snapshot.agents[]`.

## Console deep links (Day 12)

MCPLab prints and links to the **OACP Console** (not the legacy playground):

```text
http://127.0.0.1:3847/console/?trace_id=<uuid>&mode=showcase
```

Unified Docker stack (Day 51): Console is served from the same origin as the API — no separate Vite dev server required.

| Surface                                | Behavior                                                 |
| -------------------------------------- | -------------------------------------------------------- |
| `mcplab run` / crew pipelines          | stdout includes `console=` URL                           |
| `mcplab trace --open`                  | Opens Console in the default browser                     |
| MCPLab API (`/runs`, `/crews/.../run`) | `console_url` + deprecated `playground_url` (same value) |
| MCPLab web lab                         | **Open in Console** buttons on runs                      |

### Environment variables

| Variable                     | Default                 | Purpose                                                                       |
| ---------------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| `OACP_SERVER_URL`            | —                       | Alias for MCPLab → OACP API (Docker Compose Day 51)                           |
| `MCPLAB_OACP_SERVER_URL`     | `http://127.0.0.1:3847` | Internal OACP API (agents, tasks)                                             |
| `MCPLAB_OACP_CONSOLE_URL`    | _(derived)_             | Browser-facing Console base when not served from OACP (e.g. Vite dev `:5173`) |
| `MCPLAB_OACP_PLAYGROUND_URL` | _(deprecated)_          | Legacy alias for browser-facing OACP origin                                   |

**Docker unified stack (Day 51):** both API and Console live on port **3847**:

```bash
OACP_SERVER_URL=http://127.0.0.1:3847
MCPLAB_OACP_SERVER_URL=http://127.0.0.1:3847
MCPLAB_OACP_CONSOLE_URL=http://127.0.0.1:3847/console
```

When Console runs on the Vite dev server (`http://127.0.0.1:5173`), set:

```bash
MCPLAB_OACP_CONSOLE_URL=http://127.0.0.1:5173
```

### SDK helpers

**Python (`oacp_sdk`):**

```python
from oacp_sdk import console_trace_url

url = console_trace_url("http://127.0.0.1:3847", trace_id)
```

**TypeScript (`@oacp/sdk`):**

```typescript
import { buildConsoleTraceUrl } from '@oacp/sdk';

const url = buildConsoleTraceUrl('http://127.0.0.1:3847', traceId);
```

**Observability client (`@oacp/observability-client`):**

```typescript
import { buildConsoleTraceUrl, buildTraceDeepLink } from '@oacp/observability-client';
```

Legacy `GET /playground` redirects to `/console/` with query passthrough on `@oacp/server`.

## MCPLab implementation checklist

Wire these in the **MCPLab** repository (outside this monorepo):

- [x] All `POST /agents` payloads include `metadata.fleet` + `metadata.role`
- [x] Use `register_mcplab_agent` / `registerMcplabAgent` from OACP SDK
- [x] Copy this doc to `MCPLab/docs/oacp-integration.md`
- [x] Day 12: print Console deep links (`/console/?trace_id=…&mode=showcase`)
- [x] Day 15: full-loop integration test against Console — see [mcplab-full-loop.md](./mcplab-full-loop.md)

### Full-loop validation (Day 15)

```python
from oacp_sdk import validate_mcplab_console_loop

snapshot = validate_mcplab_console_loop(
    "http://127.0.0.1:3847",
    trace_id,
    console_base_url="http://127.0.0.1:3847/console",
)
```

Run the reference integration test:

```bash
export MCPLAB_OACP_SERVER_URL=http://127.0.0.1:3847
export MCPLAB_OACP_CONSOLE_URL=http://127.0.0.1:3847/console
cd sdk/python && pytest tests/integration/test_full_loop.py -m integration -v
```

## Related

- [agent-identity.md](./agent-identity.md) — identity schema + metadata fields
- [console-spec.md](./console-spec.md) — `AgentObservabilityRecord` snapshot shape
- [console.md](./console.md) — Console development + MCPLab Docker workflow
- [mcplab-full-loop.md](./mcplab-full-loop.md) — Day 15 full-loop verification
- [version1.md](./version1.md) — 60-day delivery plan
