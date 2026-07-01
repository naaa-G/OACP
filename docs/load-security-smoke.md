# Load + security smoke (Day 55)

Enterprise smoke tests for OACP v1 before Week 12 launch. Validates observability performance, MCPLab sync backfill, SSE abuse controls, and auth boundaries.

## What Day 55 covers

| Area                  | Budget / rule                            | Enforcement                                                       |
| --------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Snapshot API          | p95 **&lt; 200ms** with **100 agents**   | `server/tests/day55-snapshot-performance.test.ts`                 |
| MCPLab backfill       | **50 runs** imported in **&lt; 60s**     | `server/tests/day55-sync-backfill-smoke.test.ts`                  |
| Post-recreate OACP    | Startup sync repopulates missing traces  | Same + k6 `oacp-backfill.js`                                      |
| SSE connections       | **10 per client IP**, HTTP **429** after | `server/tests/day55-sse-rate-limit.test.ts`                       |
| Enterprise auth       | Protected routes require `OACP_API_KEY`  | `server/tests/day55-security-smoke.test.ts`                       |
| Live deployment audit | No open **P0** findings                  | `scripts/security-audit.mjs`, `scripts/mcplab-security-audit.mjs` |

## Run locally

### CI-friendly (recommended)

```bash
pnpm test:day55
```

Runs all `day55-*` Vitest suites in `@oacp/server`.

### Full Day 55 smoke (Vitest + live audits)

Requires Docker stacks when using `--live`:

```bash
pnpm docker:up          # or pnpm docker:mcplab for sync audit
pnpm test:day55:live
```

### k6 load (optional, production-like)

```bash
# Seed dataset
OACP_SERVER_URL=http://127.0.0.1:3847 OACP_API_KEY=... node benchmarks/k6/seed-day55.mjs

# Snapshot + SSE under load
k6 run benchmarks/k6/oacp-load.js

# MCPLab export → OACP backfill path
k6 run benchmarks/k6/oacp-backfill.js
```

See [benchmarks/k6/README.md](../benchmarks/k6/README.md).

## Security audit scripts

### OACP platform

```bash
OACP_SERVER_URL=http://127.0.0.1:3847 \
OACP_API_KEY=your-key \
node scripts/security-audit.mjs
```

Exits **1** on any open **P0** finding. Use `--json` for machine-readable output.

### MCPLab stack

```bash
MCPLAB_API_URL=http://127.0.0.1:8001 \
MCPLAB_API_KEY=your-mcplab-key \
MCPLAB_SYNC_SECRET=your-sync-secret \
node scripts/mcplab-security-audit.mjs
```

Validates internal observability export/trace-status auth and public API key enforcement.

## SSE rate limiting

`GET /v1/observability/events` tracks open connections per client IP (honours `X-Forwarded-For` first hop). The 11th concurrent connection from the same IP receives:

```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Maximum 10 SSE connections per client"
  }
}
```

When behind nginx (`oacp-gateway`), ensure `X-Forwarded-For` is set so per-client limits apply to real clients, not the proxy.

## P1 backlog (non-blocking)

File follow-ups as GitHub issues — not launch blockers:

| ID       | Item                                                          | Severity |
| -------- | ------------------------------------------------------------- | -------- |
| P1-55-01 | OIDC/SSO for Console (Phase 2)                                | P1       |
| P1-55-02 | Per-API-key rate limits (not just SSE/IP)                     | P1       |
| P1-55-03 | Automated k6 job in CI (optional nightly)                     | P1       |
| P1-55-04 | MCPLab coordinator readiness should detect dead mailbox tasks | P1       |

## Related docs

- [security-model.md](./security-model.md) — auth model
- [mcplab-oacp-data-model.md](./mcplab-oacp-data-model.md) — sync direction
- [production-deployment.md](./production-deployment.md) — Docker + gateway
- [integration-testing.md](./integration-testing.md) — broader test map
