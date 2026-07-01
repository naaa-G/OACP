# Production deployment

> **Day 52** — API key authentication for the OACP reference server and Console.

## Overview

The OACP reference server supports optional **shared-secret API key** authentication. When `OACP_API_KEY` is set, protected routes require a valid key. When unset, auth is disabled (local development default).

| Mode        | `OACP_API_KEY`       | Behavior                                             |
| ----------- | -------------------- | ---------------------------------------------------- |
| Development | unset                | All routes open (except documented future hardening) |
| Production  | strong random secret | Observability + mutating routes require key          |

## Protected routes

When auth is enabled:

- **Observability:** `/v1/observability/*` (except public runtime config), legacy `/playground/snapshot`
- **Mutating:** `POST /send-message`, `POST /agents`, `POST /workflows`, `POST /workflows/:id/run`

Always public:

- `GET /health`
- `GET /v1/observability/runtime-config` — tells clients whether auth is required (no secrets)
- Console static assets under `/console/`

## Docker Compose (recommended)

The default stack runs **`oacp-gateway`** (nginx) on port **3847** in front of the internal `oacp` server. When `OACP_API_KEY` is set, the gateway injects `Authorization: Bearer …` on every proxied request — including **SSE** — so the Console bundle does **not** need a build-time API key.

```bash
cp .env.example .env
openssl rand -base64 32   # paste into .env as OACP_API_KEY=

docker compose up --build -d
open http://127.0.0.1:3847/console/
```

| Service        | Role                                                        |
| -------------- | ----------------------------------------------------------- |
| `oacp`         | Reference server + Console static (internal `:3847` only)   |
| `oacp-gateway` | Public nginx reverse proxy; injects API key when configured |

Internal agents (MCPLab workers, seed scripts) call `http://oacp:3847` on the Docker network and pass `OACP_API_KEY` via `Authorization` themselves.

## Sending the API key

### HTTP (fetch, SDK, agents)

Preferred header:

```http
Authorization: Bearer <OACP_API_KEY>
```

Alternative:

```http
X-Api-Key: <OACP_API_KEY>
```

### Server-Sent Events (Console live feed)

**With nginx gateway (recommended):** browsers connect to same-origin `/v1/observability/events`; nginx adds `Authorization` on the upstream request. No secret in the Console bundle and no `api_key` query param.

**Without gateway:** browsers cannot set custom headers on `EventSource`. Use:

```
GET /v1/observability/events?api_key=<OACP_API_KEY>
```

The Console and `@oacp/observability-client` attach this automatically when `apiKey` is configured via `VITE_OACP_API_KEY`.

> **Note:** Query parameters may appear in access logs. Prefer the gateway path in production.

## Console configuration

| Variable             | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `VITE_OACP_API_KEY`  | **Fallback only** — embeds key in bundle when not using nginx gateway |
| `VITE_OACP_API_BASE` | Optional API origin override (empty = same origin)                    |

With Docker + `oacp-gateway`, leave `VITE_OACP_API_KEY` unset at build time.

At runtime, Console calls `GET /v1/observability/runtime-config` to detect whether auth is required.

## SDK and remote agents

```typescript
import { AgentClient } from '@oacp/sdk/client';

const client = new AgentClient({
  baseUrl: process.env.OACP_SERVER_URL!,
  headers: {
    Authorization: `Bearer ${process.env.OACP_API_KEY!}`,
  },
});
```

Set `OACP_API_KEY` in agent worker environment (MCPLab, Kubernetes secrets, etc.). Never commit keys to git.

## External reverse proxy

For non-Docker production, place OACP behind nginx, Traefik, or your cloud load balancer:

1. Terminate TLS at the edge.
2. Restrict ingress to trusted networks or VPN where possible.
3. Inject `Authorization: Bearer …` for proxied API traffic so the Console bundle does not contain the secret.

Example nginx snippet:

```nginx
location / {
  proxy_set_header Authorization "Bearer $oacp_api_key";
  proxy_buffering off;
  proxy_read_timeout 3600s;
  proxy_pass http://oacp:3847;
}
```

See `docker/nginx/oacp-gateway.conf.template` for the reference implementation.

## Security checklist

- [ ] Set `OACP_API_KEY` in production; rotate on compromise
- [ ] Use HTTPS for all external access
- [ ] Do not expose the internal `oacp` port publicly — use `oacp-gateway` or your LB
- [ ] Store keys in secrets manager (Docker secrets, K8s Secret, Vault)
- [ ] Restrict MCPLab internal export APIs separately (Day 53 sync)
- [ ] Full OIDC/SSO deferred to Phase 2 (Days 61–70)

## Related docs

- [MCPLab ↔ OACP data model](./mcplab-oacp-data-model.md)
- [Security model](./security-model.md)
- [Console](./console.md)
- [Remote client](./remote-client.md)
- [Observability](./observability.md)
