import { describe, expect, it } from 'vitest';

import type { AgentObservabilityRecord } from '@oacp/observability-client';

import {
  CATALOG_FLEET_ORDER,
  formatFleetSectionLabel,
  groupAgentsByFleet,
  resolveFleetBucket,
} from './fleet-catalog.js';

function agent(id: string, fleet?: string, name?: string): AgentObservabilityRecord {
  return {
    id,
    name: name ?? id,
    version: '1.0',
    capabilities: [],
    publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'test' },
    ...(fleet !== undefined ? { fleet } : {}),
  };
}

describe('resolveFleetBucket', () => {
  it('maps known fleets to their bucket', () => {
    expect(resolveFleetBucket('mcplab')).toBe('mcplab');
    expect(resolveFleetBucket('startup-demo')).toBe('startup-demo');
    expect(resolveFleetBucket('system')).toBe('system');
    expect(resolveFleetBucket('external')).toBe('external');
  });

  it('routes unknown and missing fleets to external', () => {
    expect(resolveFleetBucket(undefined)).toBe('external');
    expect(resolveFleetBucket('')).toBe('external');
    expect(resolveFleetBucket('custom-vendor')).toBe('external');
  });
});

describe('formatFleetSectionLabel', () => {
  it('returns human-readable fleet names', () => {
    expect(formatFleetSectionLabel('mcplab')).toBe('MCPLab');
    expect(formatFleetSectionLabel('startup-demo')).toBe('Startup demo');
  });
});

describe('groupAgentsByFleet', () => {
  it('groups agents under fleet headers in canonical order', () => {
    const groups = groupAgentsByFleet(
      [
        agent('agent://startup-pm', 'startup-demo'),
        agent('agent://planner', 'mcplab', 'Planner'),
        agent('agent://orphan'),
        agent('agent://custom', 'acme-corp'),
      ],
      new Set(['agent://planner']),
    );

    expect(groups.map((group) => group.fleetId)).toEqual(['mcplab', 'startup-demo', 'external']);
    expect(groups[0]?.agents.map((row) => row.id)).toEqual(['agent://planner']);
    expect(groups[2]?.agents.map((row) => row.id)).toEqual(['agent://custom', 'agent://orphan']);
  });

  it('omits empty fleet sections', () => {
    const groups = groupAgentsByFleet([agent('agent://solo', 'mcplab')], new Set());
    expect(groups).toHaveLength(1);
    expect(groups[0]?.fleetId).toBe('mcplab');
  });

  it('preserves caller sort order when preserveOrder is set', () => {
    const ordered = [
      agent('agent://z-last', 'mcplab', 'Z Last'),
      agent('agent://a-first', 'mcplab', 'A First'),
    ];

    const groups = groupAgentsByFleet(ordered, new Set(), { preserveOrder: true });
    expect(groups[0]?.agents.map((row) => row.id)).toEqual(['agent://z-last', 'agent://a-first']);
  });

  it('sorts active agents before idle within a fleet', () => {
    const groups = groupAgentsByFleet(
      [agent('agent://idle', 'mcplab', 'Idle'), agent('agent://active', 'mcplab', 'Active')],
      new Set(['agent://active']),
    );

    expect(groups[0]?.agents.map((row) => row.id)).toEqual(['agent://active', 'agent://idle']);
  });

  it('covers every catalog fleet id', () => {
    expect(CATALOG_FLEET_ORDER).toHaveLength(4);
  });
});
