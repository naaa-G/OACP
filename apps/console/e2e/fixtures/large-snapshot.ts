import type { AgentObservabilityRecord, PlaygroundSnapshot } from '@oacp/observability-client';

import { buildE2eSnapshot, E2E_TRACE_ID } from './snapshot.js';

const publicKey = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'e2e-bulk-public-key',
} as const;

function bulkAgent(index: number): AgentObservabilityRecord {
  const fleet = index % 3 === 0 ? 'startup-demo' : index % 2 === 0 ? 'mcplab' : 'external';
  const role = index % 4 === 0 ? 'planner' : index % 3 === 0 ? 'coder' : 'researcher';

  return {
    id: `agent://bulk-agent-${index}`,
    name: `Bulk Agent ${index}`,
    version: '1.0',
    capabilities: [`cap-${index % 5}`],
    publicKey,
    fleet,
    role,
    metadata: { fleet, role },
  };
}

/** Large registry snapshot for virtualization performance tests (Day 23). */
export function buildLargeE2eSnapshot(
  bulkCount: number = 100,
  traceId: string = E2E_TRACE_ID,
): PlaygroundSnapshot {
  const base = buildE2eSnapshot(traceId);
  const bulkAgents = Array.from({ length: bulkCount }, (_, index) => bulkAgent(index));

  return {
    ...base,
    agents: [...base.agents, ...bulkAgents],
    server: {
      ...base.server,
      registered_agents: base.agents.length + bulkAgents.length,
    },
  };
}
