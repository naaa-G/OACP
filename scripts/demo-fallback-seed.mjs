#!/usr/bin/env node
/**
 * Day 56 — seed all three MCPLab demo crew traces without LLM/network.
 * Uses POST /v1/observability/import (idempotent).
 */

import { loadDemoExports } from './demo-fixtures/build-exports.mjs';

const OACP_URL = (process.env.OACP_SERVER_URL ?? 'http://127.0.0.1:3847').replace(/\/+$/, '');
const PUBLIC_URL = (process.env.OACP_PUBLIC_URL ?? OACP_URL).replace(/\/+$/, '');
const API_KEY = (process.env.OACP_API_KEY ?? '').trim();

function authHeaders() {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY.length > 0) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return headers;
}

async function waitForHealth(maxAttempts = 60, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${OACP_URL}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
  throw new Error(`OACP not healthy at ${OACP_URL}/health`);
}

async function main() {
  await waitForHealth();
  const demos = loadDemoExports();

  for (const demo of demos) {
    const response = await fetch(`${OACP_URL}/v1/observability/import`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(demo.export),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`import ${demo.crew_id} failed (HTTP ${response.status}): ${text}`);
    }
  }

  console.log('Day 56 demo fallback traces seeded (no LLM required).');
  console.log('');
  for (const demo of demos) {
    const consoleUrl = `${PUBLIC_URL}/console/?${demo.console_query}`;
    console.log(`  ${demo.label}`);
    console.log(`    trace_id: ${demo.trace_id}`);
    console.log(`    Console:  ${consoleUrl}`);
    console.log('');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
