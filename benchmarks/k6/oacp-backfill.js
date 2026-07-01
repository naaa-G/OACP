import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = (__ENV.OACP_SERVER_URL ?? 'http://127.0.0.1:3847').replace(/\/+$/, '');
const MCPLAB_EXPORT_URL = (
  __ENV.MCPLAB_OBSERVABILITY_EXPORT_URL ?? 'http://127.0.0.1:8001/internal/observability/export'
).replace(/\/+$/, '');
const API_KEY = __ENV.OACP_API_KEY ?? __ENV.MCPLAB_SYNC_SECRET ?? '';

const backfillDuration = new Trend('backfill_duration', true);
const postSyncSnapshotDuration = new Trend('post_sync_snapshot_duration', true);

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    backfill_duration: ['value<60000'],
    post_sync_snapshot_duration: ['p(95)<200'],
    checks: ['rate>0.99'],
  },
};

function authHeaders() {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY.length > 0) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return headers;
}

export default function run() {
  const exportResponse = http.get(MCPLAB_EXPORT_URL, {
    headers: authHeaders(),
    tags: { name: 'mcplab_export' },
  });
  check(exportResponse, {
    'export status 200': (response) => response.status === 200,
  });

  const bundle = exportResponse.json();
  const exports = Array.isArray(bundle?.exports) ? bundle.exports : [];

  const backfillStarted = Date.now();
  let imported = 0;
  for (const traceExport of exports) {
    const importResponse = http.post(
      `${BASE_URL}/v1/observability/import`,
      JSON.stringify(traceExport),
      {
        headers: authHeaders(),
        tags: { name: 'oacp_import' },
      },
    );
    if (importResponse.status === 200) {
      imported += 1;
    }
  }
  backfillDuration.add(Date.now() - backfillStarted);

  check(null, {
    'imported traces': () => imported > 0,
    'backfill under 60s': () => Date.now() - backfillStarted < 60_000,
  });

  const samples = [];
  for (let index = 0; index < 20; index += 1) {
    const started = Date.now();
    const snapshot = http.get(`${BASE_URL}/v1/observability/snapshot`, {
      headers: authHeaders(),
      tags: { name: 'post_sync_snapshot' },
    });
    samples.push(Date.now() - started);
    check(snapshot, { 'snapshot 200': (response) => response.status === 200 });
  }

  samples.sort((left, right) => left - right);
  const p95 = samples[Math.max(0, Math.ceil(samples.length * 0.95) - 1)] ?? 0;
  postSyncSnapshotDuration.add(p95);
  check(null, {
    'snapshot p95 under 200ms': () => p95 < 200,
  });
}
