#!/usr/bin/env node
/**
 * Day 55 — MCPLab security smoke audit against a running stack.
 *
 * Usage:
 *   MCPLAB_API_URL=http://127.0.0.1:8001 MCPLAB_SYNC_SECRET=... node scripts/mcplab-security-audit.mjs
 */

const MCPLAB_API_URL = (process.env.MCPLAB_API_URL ?? 'http://127.0.0.1:8001').replace(/\/+$/, '');
const MCPLAB_API_KEY = (process.env.MCPLAB_API_KEY ?? '').trim();
const SYNC_SECRET = (process.env.MCPLAB_SYNC_SECRET ?? process.env.OACP_API_KEY ?? '').trim();
const JSON_OUTPUT = process.argv.includes('--json');

/** @type {Array<{ id: string, severity: 'P0' | 'P1', ok: boolean, detail: string }>} */
const findings = [];

function record(id, severity, ok, detail) {
  findings.push({ id, severity, ok, detail });
}

async function request(path, options = {}) {
  const headers = { Accept: 'application/json' };
  if (options.apiKey && MCPLAB_API_KEY.length > 0) {
    headers.Authorization = `Bearer ${MCPLAB_API_KEY}`;
  }
  if (options.syncSecret && SYNC_SECRET.length > 0) {
    headers.Authorization = `Bearer ${SYNC_SECRET}`;
  }

  const response = await fetch(`${MCPLAB_API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function main() {
  const ready = await request('/ready');
  record('mcplab-api-ready', 'P0', ready.status === 200, `GET /ready → HTTP ${ready.status}`);

  const exportDenied = await request('/internal/observability/export');
  if (SYNC_SECRET.length > 0) {
    record(
      'export-requires-sync-secret',
      'P0',
      exportDenied.status === 401 || exportDenied.status === 403,
      `Unauthenticated export → HTTP ${exportDenied.status}`,
    );

    const exportAllowed = await request('/internal/observability/export', { syncSecret: true });
    record(
      'export-auth-works',
      'P0',
      exportAllowed.status === 200,
      `Authenticated export → HTTP ${exportAllowed.status}`,
    );

    const traceStatusDenied = await fetch(`${MCPLAB_API_URL}/internal/observability/trace-status`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    record(
      'trace-status-requires-sync-secret',
      'P0',
      traceStatusDenied.status === 401 || traceStatusDenied.status === 403,
      `Unauthenticated trace-status → HTTP ${traceStatusDenied.status}`,
    );
  } else {
    record(
      'export-requires-sync-secret',
      'P1',
      true,
      'MCPLAB_SYNC_SECRET unset — skipping internal route auth checks',
    );
  }

  if (MCPLAB_API_KEY.length > 0) {
    const runsDenied = await request('/runs');
    record(
      'runs-requires-api-key',
      'P0',
      runsDenied.status === 401,
      `Unauthenticated /runs → HTTP ${runsDenied.status}`,
    );

    const runsAllowed = await request('/runs', { apiKey: true });
    record(
      'runs-auth-works',
      'P0',
      runsAllowed.status === 200,
      `Authenticated /runs → HTTP ${runsAllowed.status}`,
    );
  } else {
    record(
      'runs-requires-api-key',
      'P1',
      true,
      'MCPLAB_API_KEY unset — skipping public API auth checks',
    );
  }

  const p0Open = findings.filter((row) => row.severity === 'P0' && !row.ok);
  const summary = {
    ok: p0Open.length === 0,
    mcplab_api_url: MCPLAB_API_URL,
    findings,
    p0_open: p0Open.length,
  };

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`MCPLab security audit — ${MCPLAB_API_URL}`);
    for (const row of findings) {
      const mark = row.ok ? 'PASS' : row.severity;
      console.log(`[${mark}] ${row.id}: ${row.detail}`);
    }
    console.log(`P0 open: ${p0Open.length}`);
  }

  if (p0Open.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
