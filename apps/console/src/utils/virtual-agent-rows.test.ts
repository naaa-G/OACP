import { describe, expect, it } from 'vitest';

import type { AgentObservabilityRecord } from '@oacp/observability-client';

import type { FleetAgentGroup } from './fleet-catalog.js';
import {
  buildVirtualAgentRows,
  estimateVirtualRowSize,
  findVirtualAgentRowIndex,
} from './virtual-agent-rows.js';

function agent(id: string): AgentObservabilityRecord {
  return {
    id,
    name: id,
    version: '1.0',
    capabilities: ['echo'],
    publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'test' },
    fleet: 'mcplab',
  };
}

const groups: FleetAgentGroup[] = [
  {
    fleetId: 'mcplab',
    agents: [agent('agent://a'), agent('agent://b')],
  },
  {
    fleetId: 'external',
    agents: [agent('agent://c')],
  },
];

describe('buildVirtualAgentRows', () => {
  it('includes fleet headers and expanded agents', () => {
    const rows = buildVirtualAgentRows(groups, () => false);
    expect(rows.map((row) => row.type)).toEqual([
      'fleet-header',
      'agent',
      'agent',
      'fleet-header',
      'agent',
    ]);
  });

  it('prepends pinned agents before fleet sections', () => {
    const pinned = [agent('agent://pinned')];
    const rows = buildVirtualAgentRows(groups, () => false, pinned);
    expect(rows.map((row) => row.type)).toEqual([
      'pinned-header',
      'agent',
      'fleet-header',
      'agent',
      'agent',
      'fleet-header',
      'agent',
    ]);
    expect(rows[1]).toMatchObject({
      type: 'agent',
      key: 'pinned:agent://pinned',
      pinned: true,
    });
  });

  it('omits agents when fleet is collapsed', () => {
    const rows = buildVirtualAgentRows(groups, (fleetId) => fleetId === 'mcplab');
    expect(rows).toHaveLength(3);
    expect(rows.filter((row) => row.type === 'agent')).toEqual([
      expect.objectContaining({ key: 'agent:agent://c' }),
    ]);
  });
});

describe('estimateVirtualRowSize', () => {
  it('uses smaller heights for compact agent rows', () => {
    const agentRow = buildVirtualAgentRows(groups, () => false).find((row) => row.type === 'agent');
    expect(agentRow).toBeDefined();
    const compact = estimateVirtualRowSize(agentRow!, 'compact');
    const detailed = estimateVirtualRowSize(agentRow!, 'detailed');
    expect(compact).toBeLessThan(detailed);
  });
});

describe('findVirtualAgentRowIndex', () => {
  it('finds the row index for an agent id', () => {
    const rows = buildVirtualAgentRows(groups, () => false);
    expect(findVirtualAgentRowIndex(rows, 'agent://b')).toBe(2);
  });

  it('finds pinned agents before fleet rows', () => {
    const rows = buildVirtualAgentRows(groups, () => false, [agent('agent://b')]);
    expect(findVirtualAgentRowIndex(rows, 'agent://b')).toBe(1);
  });
});
