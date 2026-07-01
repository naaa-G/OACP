#!/usr/bin/env node
/**
 * Build observability import payloads from scripts/demo-fixtures/crews.json.
 * Shared by demo-fallback-seed.mjs and rehearse-demo.mjs.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEV_PUBLIC_KEY = {
  kty: 'EC',
  crv: 'P-256',
  x: 'WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWlibY',
  y: 'ALOpExF7nDwyk9V4ToWo3L5v_6Y1sQJCrcn_6OlOWf5',
  use: 'sig',
  alg: 'ES256',
  kid: 'summarizer-2026',
};

function loadCatalog() {
  const raw = readFileSync(join(__dirname, 'crews.json'), 'utf8');
  return JSON.parse(raw);
}

function agentIdentity(crewId, role, capability) {
  return {
    id: `agent://mcplab-${role}-demo-${crewId}`,
    name: `${role} (${crewId})`,
    version: '1.0',
    capabilities: [capability],
    publicKey: DEV_PUBLIC_KEY,
    metadata: { fleet: 'mcplab', role, crew: crewId },
  };
}

function messageId(crewIndex, step) {
  const value = crewIndex * 16 + step;
  const hex = value.toString(16).padStart(12, '0');
  return `d5600de0-0000-4000-8000-${hex}`;
}

/**
 * @param {import('./crews.json')} catalog
 */
export function buildExportsFromCatalog(catalog = loadCatalog()) {
  return catalog.crews.map((crew, crewIndex) => {
    const agents = crew.agents.map(({ role, capability }) =>
      agentIdentity(crew.id, role, capability),
    );
    const coordinator = agents[0];
    const worker = agents[Math.min(2, agents.length - 1)];
    const traceId = crew.trace_id;
    const started = `2026-07-01T12:${String(crewIndex).padStart(2, '0')}:00.000Z`;
    const replied = `2026-07-01T12:${String(crewIndex).padStart(2, '0')}:05.000Z`;

    const messages = [
      {
        type: 'task_request',
        version: '1.0',
        message_id: messageId(crewIndex, 1),
        trace_id: traceId,
        from: coordinator.id,
        timestamp: started,
        capability: coordinator.capabilities[0],
        input: { goal: crew.goal },
        deadline_ms: 60_000,
      },
      {
        type: 'task_request',
        version: '1.0',
        message_id: messageId(crewIndex, 2),
        trace_id: traceId,
        from: coordinator.id,
        to: worker.id,
        timestamp: started,
        capability: worker.capabilities[0],
        input: { goal: crew.goal, delegated: true },
        deadline_ms: 60_000,
      },
      {
        type: 'task_response',
        version: '1.0',
        message_id: messageId(crewIndex, 3),
        trace_id: traceId,
        from: worker.id,
        in_reply_to: messageId(crewIndex, 2),
        timestamp: replied,
        status: 'success',
        output: {
          crew: crew.id,
          summary: `Demo fallback output for ${crew.label}`,
          artifact: `artifacts/${crew.id}/demo.md`,
        },
      },
    ];

    return {
      crew_id: crew.id,
      label: crew.label,
      trace_id: traceId,
      console_query: crew.console_query,
      export: {
        trace_id: traceId,
        run_id: `demo-${crew.id}`,
        agents,
        messages,
        completed_at: replied,
        source: 'mcplab-demo-fixture',
      },
    };
  });
}

export function loadDemoExports() {
  return buildExportsFromCatalog();
}
