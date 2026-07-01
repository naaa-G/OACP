#!/usr/bin/env node
/**
 * Day 56 — automated demo rehearsal (import fixtures + validate snapshot contract).
 *
 *   node scripts/rehearse-demo.mjs
 *   node scripts/rehearse-demo.mjs --rounds 2
 */

import { loadDemoExports } from './demo-fixtures/build-exports.mjs';

const OACP_URL = (process.env.OACP_SERVER_URL ?? 'http://127.0.0.1:3847').replace(/\/+$/, '');
const API_KEY = (process.env.OACP_API_KEY ?? '').trim();
const rounds = Number(process.argv.find((arg) => arg.startsWith('--rounds='))?.split('=')[1] ?? 2);

function authHeaders() {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY.length > 0) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return headers;
}

async function waitForHealth() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(`${OACP_URL}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }
  throw new Error('OACP health check failed');
}

async function importDemo(demo) {
  const response = await fetch(`${OACP_URL}/v1/observability/import`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(demo.export),
  });
  if (!response.ok) {
    throw new Error(`import ${demo.crew_id} failed: HTTP ${response.status}`);
  }
}

async function assertSnapshot(demo) {
  const response = await fetch(
    `${OACP_URL}/v1/observability/snapshot?trace_id=${encodeURIComponent(demo.trace_id)}`,
    { headers: authHeaders() },
  );
  if (!response.ok) {
    throw new Error(`snapshot ${demo.crew_id} failed: HTTP ${response.status}`);
  }

  const body = await response.json();
  const snapshot = body?.snapshot;
  if (!snapshot) {
    throw new Error(`snapshot ${demo.crew_id} missing envelope`);
  }

  const mcplabAgents = (snapshot.agents ?? []).filter((row) => row.fleet === 'mcplab');
  if (mcplabAgents.length < 5) {
    throw new Error(
      `snapshot ${demo.crew_id} expected >=5 mcplab agents, got ${mcplabAgents.length}`,
    );
  }

  if (snapshot.active_trace?.trace_id !== demo.trace_id) {
    throw new Error(`snapshot ${demo.crew_id} active_trace mismatch`);
  }

  const timeline = snapshot.active_trace?.timeline ?? [];
  if (timeline.length < 1) {
    throw new Error(`snapshot ${demo.crew_id} expected timeline messages`);
  }
}

async function runRound(round) {
  const demos = loadDemoExports();
  for (const demo of demos) {
    await importDemo(demo);
    await assertSnapshot(demo);
  }
  console.log(`Round ${round}: ${demos.length} crews imported + snapshot validated`);
}

async function main() {
  await waitForHealth();
  for (let round = 1; round <= rounds; round += 1) {
    await runRound(round);
  }
  console.log(`Demo rehearsal complete (${rounds} rounds, no blocking failures).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
