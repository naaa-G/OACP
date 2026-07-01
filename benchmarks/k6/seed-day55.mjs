#!/usr/bin/env node
/**
 * Seed Day 55 k6 dataset against a running OACP server.
 *
 *   OACP_SERVER_URL=http://127.0.0.1:3847 node benchmarks/k6/seed-day55.mjs
 */

const BASE_URL = (process.env.OACP_SERVER_URL ?? 'http://127.0.0.1:3847').replace(/\/+$/, '');
const API_KEY = (process.env.OACP_API_KEY ?? '').trim();
const AGENT_COUNT = Number(process.env.DAY55_AGENT_COUNT ?? 100);
const TRACE_COUNT = Number(process.env.DAY55_TRACE_COUNT ?? 50);

function authHeaders() {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY.length > 0) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return headers;
}

function day55TraceId(index) {
  const hex = index.toString(16).padStart(12, '0');
  return `d5500000-0000-4000-8000-${hex}`;
}

function day55MessageId(traceIndex, messageIndex) {
  const value = traceIndex * 10 + messageIndex;
  const hex = value.toString(16).padStart(12, '0');
  return `d5500001-0000-4000-8000-${hex}`;
}

const PUBLIC_KEY = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'k6-day55-public-key-material',
};

async function main() {
  console.log(
    `Seeding Day 55 dataset at ${BASE_URL} (${AGENT_COUNT} agents, ${TRACE_COUNT} traces)`,
  );

  for (let index = 0; index < AGENT_COUNT; index += 1) {
    const response = await fetch(`${BASE_URL}/agents`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        identity: {
          id: `agent://day55-agent-${index}`,
          name: `Day55 Agent ${index}`,
          version: '1.0',
          capabilities: ['echo'],
          publicKey: PUBLIC_KEY,
          metadata: { fleet: index % 2 === 0 ? 'mcplab' : 'external', role: 'worker' },
        },
      }),
    });
    if (!response.ok && response.status !== 409) {
      throw new Error(`agent ${index} failed: HTTP ${response.status}`);
    }
  }

  for (let traceIndex = 0; traceIndex < TRACE_COUNT; traceIndex += 1) {
    const traceId = day55TraceId(traceIndex);
    const from = `agent://day55-agent-${traceIndex % AGENT_COUNT}`;
    const response = await fetch(`${BASE_URL}/v1/observability/import`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        trace_id: traceId,
        run_id: `mcplab-run-${traceIndex}`,
        agents: [
          {
            id: from,
            name: `Day55 Agent ${traceIndex % AGENT_COUNT}`,
            version: '1.0',
            capabilities: ['echo'],
            publicKey: PUBLIC_KEY,
          },
        ],
        messages: [
          {
            version: '1.0',
            type: 'task_request',
            message_id: day55MessageId(traceIndex, 1),
            trace_id: traceId,
            from,
            timestamp: '2026-07-01T12:00:00.000Z',
            capability: 'echo',
            input: { text: `k6 trace ${traceIndex}` },
          },
        ],
        source: 'mcplab',
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`import trace ${traceIndex} failed: HTTP ${response.status} ${text}`);
    }
  }

  console.log('Day 55 seed complete');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
