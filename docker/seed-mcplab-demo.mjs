#!/usr/bin/env node
/**
 * Seed a MCPLab research-crew style trace against a running OACP server.
 * Used by `docker compose --profile demo up` (Day 51 acceptance).
 */

const OACP_URL = (process.env.OACP_SERVER_URL ?? 'http://127.0.0.1:3847').replace(/\/+$/, '');
const PUBLIC_URL = (process.env.OACP_PUBLIC_URL ?? OACP_URL).replace(/\/+$/, '');
const OACP_API_KEY = (process.env.OACP_API_KEY ?? '').trim();

function buildAuthHeaders() {
  const headers = { accept: 'application/json' };
  if (OACP_API_KEY.length > 0) {
    headers.authorization = `Bearer ${OACP_API_KEY}`;
  }
  return headers;
}

async function postJson(path, body) {
  const response = await fetch(`${OACP_URL}${path}`, {
    method: 'POST',
    headers: { ...buildAuthHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST ${path} failed (${response.status}): ${text}`);
  }

  return response.json().catch(() => ({}));
}

const DEV_PUBLIC_KEY = {
  kty: 'EC',
  crv: 'P-256',
  x: 'WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWlibY',
  y: 'ALOpExF7nDwyk9V4ToWo3L5v_6Y1sQJCrcn_6OlOWf5',
  use: 'sig',
  alg: 'ES256',
  kid: 'summarizer-2026',
};

const RESEARCH_CREW = [
  { role: 'coordinator', capability: 'orchestrate' },
  { role: 'planner', capability: 'plan' },
  { role: 'researcher', capability: 'research' },
  { role: 'synthesizer', capability: 'synthesize' },
  { role: 'publisher', capability: 'publish' },
];

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
  throw new Error(`OACP server not healthy at ${OACP_URL}/health`);
}

function buildAgentIdentity(role, capability) {
  return {
    id: `agent://mcplab-${role}-docker-demo`,
    name: `${role} (docker demo)`,
    version: '1.0',
    capabilities: [capability],
    publicKey: DEV_PUBLIC_KEY,
    metadata: { fleet: 'mcplab', role },
  };
}

async function main() {
  console.log(`Waiting for OACP at ${OACP_URL}…`);
  await waitForHealth();

  const traceId = crypto.randomUUID();
  const coordinatorId = `agent://mcplab-${RESEARCH_CREW[0].role}-docker-demo`;

  for (const { role, capability } of RESEARCH_CREW) {
    await postJson('/agents', { identity: buildAgentIdentity(role, capability) });
  }

  await postJson('/send-message', {
    type: 'task_request',
    version: '1.0',
    message_id: crypto.randomUUID(),
    trace_id: traceId,
    from: coordinatorId,
    timestamp: new Date().toISOString(),
    capability: 'plan',
    input: { goal: 'MCPLab research crew — Docker demo seed' },
    deadline_ms: 30_000,
  });

  const consoleUrl = `${PUBLIC_URL}/console/?trace_id=${traceId}&mode=showcase`;
  console.log('');
  console.log('MCPLab-style demo trace seeded.');
  console.log(`  trace_id:  ${traceId}`);
  console.log(`  agents:    ${RESEARCH_CREW.length} (fleet=mcplab)`);
  console.log(`  Console:   ${consoleUrl}`);
  console.log('');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
