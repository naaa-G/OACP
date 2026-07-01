import type { AgentObservabilityRecord } from '@oacp/observability-client';

import type { AgentCatalogDensity } from '../hooks/useAgentCatalogDensity.js';
import type { CatalogFleetId, FleetAgentGroup } from './fleet-catalog.js';
import { resolveFleetBucket } from './fleet-catalog.js';

export type VirtualAgentRow =
  | {
      readonly type: 'pinned-header';
      readonly agentCount: number;
      readonly key: string;
    }
  | {
      readonly type: 'fleet-header';
      readonly fleetId: CatalogFleetId;
      readonly agentCount: number;
      readonly key: string;
    }
  | {
      readonly type: 'agent';
      readonly agent: AgentObservabilityRecord;
      readonly fleetId: CatalogFleetId;
      readonly key: string;
      readonly pinned?: boolean;
    };

export const VIRTUAL_ROW_GAP_PX = 8;

export const VIRTUAL_ROW_HEIGHT = {
  fleetHeader: 44,
  agentCompact: 50,
  agentDetailed: 128,
} as const;

/** Flatten pinned agents and fleet groups into virtual scroll rows. */
export function buildVirtualAgentRows(
  fleetGroups: readonly FleetAgentGroup[],
  isFleetCollapsed: (fleetId: CatalogFleetId) => boolean,
  pinnedAgents: readonly AgentObservabilityRecord[] = [],
): readonly VirtualAgentRow[] {
  const rows: VirtualAgentRow[] = [];

  if (pinnedAgents.length > 0) {
    rows.push({
      type: 'pinned-header',
      agentCount: pinnedAgents.length,
      key: 'header:pinned',
    });

    for (const agent of pinnedAgents) {
      rows.push({
        type: 'agent',
        agent,
        fleetId: resolveFleetBucket(agent.fleet),
        key: `pinned:${agent.id}`,
        pinned: true,
      });
    }
  }

  for (const group of fleetGroups) {
    rows.push({
      type: 'fleet-header',
      fleetId: group.fleetId,
      agentCount: group.agents.length,
      key: `header:${group.fleetId}`,
    });

    if (isFleetCollapsed(group.fleetId)) {
      continue;
    }

    for (const agent of group.agents) {
      rows.push({
        type: 'agent',
        agent,
        fleetId: group.fleetId,
        key: `agent:${agent.id}`,
        pinned: false,
      });
    }
  }

  return rows;
}

export function estimateVirtualRowSize(row: VirtualAgentRow, density: AgentCatalogDensity): number {
  if (row.type === 'pinned-header' || row.type === 'fleet-header') {
    return VIRTUAL_ROW_HEIGHT.fleetHeader;
  }

  return density === 'compact' ? VIRTUAL_ROW_HEIGHT.agentCompact : VIRTUAL_ROW_HEIGHT.agentDetailed;
}

export function findVirtualAgentRowIndex(
  rows: readonly VirtualAgentRow[],
  agentId: string,
): number {
  return rows.findIndex((row) => row.type === 'agent' && row.agent.id === agentId);
}
