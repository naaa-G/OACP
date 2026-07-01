#!/usr/bin/env node
/**
 * Day 55 — OACP security smoke audit (enterprise deployment checklist).
 *
 * Usage:
 *   OACP_SERVER_URL=http://127.0.0.1:3847 OACP_API_KEY=secret node scripts/security-audit.mjs
 *   node scripts/security-audit.mjs --json
 */

const BASE_URL = (process.env.OACP_SERVER_URL ?? 'http://127.0.0.1:3847').replace(/\/+$/, '');
const API_KEY = (process.env.OACP_API_KEY ?? '').trim();
const JSON_OUTPUT = process.argv.includes('--json');

/** @typedef {{ id: string, severity: 'P0' | 'P1', ok: boolean, detail: string }} Finding */

/** @type {Finding[]} */
const findings = [];

function record(id, severity, ok, detail) {
  findings.push({ id, severity, ok, detail });
}

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
  };
  if (options.auth && API_KEY.length > 0) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  if (options.method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let json;
  try {
    json = text.length > 0 ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  return { status: response.status, text, json };
}

async function main() {
  record(
    'auth-key-configured',
    'P1',
    API_KEY.length > 0,
    API_KEY.length > 0
      ? 'OACP_API_KEY is set for this audit run'
      : 'OACP_API_KEY unset — auth checks are best-effort only (dev mode)',
  );

  const health = await request('/health');
  record(
    'health-public',
    'P0',
    health.status === 200 && health.json?.ok === true,
    `GET /health → HTTP ${health.status}`,
  );
  record(
    'health-no-secret-leak',
    'P0',
    !health.text.includes(API_KEY) || API_KEY.length === 0,
    'Health response does not echo configured API key',
  );

  const runtime = await request('/v1/observability/runtime-config');
  record(
    'runtime-config-public',
    'P0',
    runtime.status === 200,
    `GET /v1/observability/runtime-config → HTTP ${runtime.status}`,
  );

  const snapshotDenied = await request('/v1/observability/snapshot');
  if (API_KEY.length > 0) {
    record(
      'snapshot-requires-auth',
      'P0',
      snapshotDenied.status === 401,
      `Unauthenticated snapshot → HTTP ${snapshotDenied.status} (expected 401)`,
    );
  } else {
    record(
      'snapshot-requires-auth',
      'P1',
      snapshotDenied.status === 200,
      'Auth disabled in dev — snapshot is public (set OACP_API_KEY in production)',
    );
  }

  if (API_KEY.length > 0) {
    const snapshotAllowed = await request('/v1/observability/snapshot', { auth: true });
    record(
      'snapshot-auth-works',
      'P0',
      snapshotAllowed.status === 200 && snapshotAllowed.json?.ok === true,
      `Authenticated snapshot → HTTP ${snapshotAllowed.status}`,
    );

    const registerDenied = await request('/agents', {
      method: 'POST',
      body: {
        identity: {
          id: 'agent://security-audit-probe',
          name: 'Security Audit Probe',
          version: '1.0',
          capabilities: ['echo'],
          publicKey: {
            kty: 'OKP',
            crv: 'Ed25519',
            x: 'audit-probe-public-key',
          },
        },
      },
    });
    record(
      'register-requires-auth',
      'P0',
      registerDenied.status === 401,
      `Unauthenticated POST /agents → HTTP ${registerDenied.status}`,
    );

    const importDenied = await request('/v1/observability/import', {
      method: 'POST',
      body: { trace_id: '00000000-0000-4000-8000-000000000099', messages: [] },
    });
    record(
      'import-requires-auth',
      'P0',
      importDenied.status === 401,
      `Unauthenticated import → HTTP ${importDenied.status}`,
    );
  }

  const p0Open = findings.filter((row) => row.severity === 'P0' && !row.ok);
  const p1Open = findings.filter((row) => row.severity === 'P1' && !row.ok);
  const summary = {
    ok: p0Open.length === 0,
    base_url: BASE_URL,
    findings,
    p0_open: p0Open.length,
    p1_open: p1Open.length,
  };

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`OACP security audit — ${BASE_URL}`);
    for (const row of findings) {
      const mark = row.ok ? 'PASS' : row.severity;
      console.log(`[${mark}] ${row.id}: ${row.detail}`);
    }
    console.log('');
    console.log(`P0 open: ${p0Open.length} | P1 open: ${p1Open.length}`);
  }

  if (p0Open.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
