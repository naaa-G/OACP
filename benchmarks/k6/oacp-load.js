import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = (__ENV.OACP_SERVER_URL ?? 'http://127.0.0.1:3847').replace(/\/+$/, '');
const API_KEY = __ENV.OACP_API_KEY ?? '';
const TRACE_ID = __ENV.DAY55_TRACE_ID ?? 'd5500000-0000-4000-8000-000000000000';

const snapshotDuration = new Trend('snapshot_duration', true);
const sseOpenDuration = new Trend('sse_open_duration', true);

export const options = {
  scenarios: {
    snapshot_load: {
      executor: 'constant-vus',
      vus: Number(__ENV.K6_VUS ?? 10),
      duration: __ENV.K6_DURATION ?? '30s',
    },
  },
  thresholds: {
    snapshot_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.99'],
  },
};

function authHeaders(extra = {}) {
  const headers = { Accept: 'application/json', ...extra };
  if (API_KEY.length > 0) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return headers;
}

export function setup() {
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'platform healthy': (response) => response.status === 200 });
  return { baseUrl: BASE_URL };
}

export default function run(data) {
  const snapshotStarted = Date.now();
  const snapshot = http.get(`${data.baseUrl}/v1/observability/snapshot`, {
    headers: authHeaders(),
    tags: { name: 'snapshot' },
  });
  snapshotDuration.add(Date.now() - snapshotStarted);
  check(snapshot, {
    'snapshot status 200': (response) => response.status === 200,
    'snapshot has agents': (response) => {
      try {
        const body = response.json();
        return Array.isArray(body?.snapshot?.agents);
      } catch {
        return false;
      }
    },
  });

  const sseStarted = Date.now();
  const sse = http.get(
    `${data.baseUrl}/v1/observability/events?trace_id=${encodeURIComponent(TRACE_ID)}${
      API_KEY.length > 0 ? `&api_key=${encodeURIComponent(API_KEY)}` : ''
    }`,
    {
      headers: { Accept: 'text/event-stream' },
      tags: { name: 'sse_open' },
      timeout: '5s',
    },
  );
  sseOpenDuration.add(Date.now() - sseStarted);
  check(sse, {
    'sse opens': (response) => response.status === 200 || response.status === 429,
  });

  sleep(0.2);
}
