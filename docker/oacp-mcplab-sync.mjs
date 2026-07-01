#!/usr/bin/env node
/**
 * MCPLab → OACP observability backfill (Day 53).
 * Run after OACP is healthy when MCPLab export API is available.
 */

const OACP_URL = (process.env.OACP_SERVER_URL ?? 'http://oacp:3847').replace(/\/+$/, '');
const EXPORT_URL = (process.env.MCPLAB_OBSERVABILITY_EXPORT_URL ?? '').trim();
const API_KEY = (process.env.OACP_API_KEY ?? process.env.MCPLAB_SYNC_SECRET ?? '').trim();

function authHeaders() {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY.length > 0) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return headers;
}

async function waitForOacp(maxAttempts = 60, delayMs = 2000) {
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
  if (EXPORT_URL.length === 0) {
    console.log('MCPLAB_OBSERVABILITY_EXPORT_URL unset — skipping MCPLab sync');
    return;
  }

  await waitForOacp();

  const exportResponse = await fetch(EXPORT_URL, { headers: authHeaders() });
  if (!exportResponse.ok) {
    throw new Error(`MCPLab export failed (HTTP ${exportResponse.status})`);
  }

  const bundle = await exportResponse.json();
  const exports = Array.isArray(bundle.exports) ? bundle.exports : [];
  let imported = 0;
  let skipped = 0;

  for (const traceExport of exports) {
    const importResponse = await fetch(`${OACP_URL}/v1/observability/import`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(traceExport),
    });

    if (!importResponse.ok) {
      const text = await importResponse.text();
      console.warn(`Import failed for ${traceExport.trace_id}: ${text}`);
      continue;
    }

    const body = await importResponse.json();
    if (body?.result?.imported_messages > 0 || body?.result?.registered_agents > 0) {
      imported += 1;
    } else {
      skipped += 1;
    }
  }

  console.log(
    `MCPLab → OACP sync complete: imported=${imported} skipped=${skipped} total=${exports.length}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
