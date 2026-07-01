# Day 55 k6 load benchmarks

Enterprise-style load smoke for OACP v1 observability APIs.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed locally
- OACP platform running (`pnpm docker:up` or `pnpm docker:mcplab`)
- Optional: `OACP_API_KEY` when enterprise auth is enabled

## Quick start

```bash
# 1. Seed 100 agents + 50 traces
OACP_SERVER_URL=http://127.0.0.1:3847 \
OACP_API_KEY=your-key \
node benchmarks/k6/seed-day55.mjs

# 2. Snapshot + SSE load (p95 snapshot < 200ms)
OACP_SERVER_URL=http://127.0.0.1:3847 \
OACP_API_KEY=your-key \
k6 run benchmarks/k6/oacp-load.js

# 3. MCPLab export → OACP backfill smoke (requires MCPLab stack)
OACP_SERVER_URL=http://127.0.0.1:3847 \
MCPLAB_OBSERVABILITY_EXPORT_URL=http://127.0.0.1:8001/internal/observability/export \
OACP_API_KEY=your-key \
k6 run benchmarks/k6/oacp-backfill.js
```

## CI-friendly alternative

Vitest smoke tests enforce the same budgets without k6:

```bash
pnpm test:day55
```

## Thresholds

| Metric                 | Budget                         |
| ---------------------- | ------------------------------ |
| Snapshot p95           | `< 200ms`                      |
| 50-run MCPLab backfill | `< 60s`                        |
| SSE connections per IP | `10` max (HTTP 429 thereafter) |

See [docs/load-security-smoke.md](../../docs/load-security-smoke.md).
