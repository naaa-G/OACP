import type { AgentObservabilityRecord } from '@oacp/observability-client';

import { CONSOLE_FLEET_LABELS } from '../config/console-fleets.js';

/** Canonical fleet buckets for the agent catalog (Day 17). */
export const CATALOG_FLEET_ORDER = ['mcplab', 'startup-demo', 'system', 'external'] as const;

export type KnownCatalogFleetId = (typeof CATALOG_FLEET_ORDER)[number];

/** Known fleet buckets plus configured custom fleet ids from `VITE_OACP_CONSOLE_FLEETS`. */
export type CatalogFleetId = KnownCatalogFleetId | (string & {});

const KNOWN_FLEETS = new Set<string>(CATALOG_FLEET_ORDER);

const FLEET_DISPLAY_NAMES: Record<KnownCatalogFleetId, string> = {
  mcplab: 'MCPLab',
  'startup-demo': 'Startup demo',
  system: 'System',
  external: 'External',
};

/** Custom fleet ids from `VITE_OACP_CONSOLE_FLEETS` (sorted, before External). */
export function getCustomFleetIds(): readonly string[] {
  return Object.keys(CONSOLE_FLEET_LABELS).sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  );
}

/** Full catalog section order including configured custom fleets. */
export function getCatalogFleetOrder(): readonly string[] {
  const custom = getCustomFleetIds();
  if (custom.length === 0) {
    return CATALOG_FLEET_ORDER;
  }
  return [...CATALOG_FLEET_ORDER.slice(0, -1), ...custom, 'external'];
}

/** Map snapshot fleet to a catalog section; configured custom fleets get own section. */
export function resolveFleetBucket(fleet: string | undefined): string {
  if (fleet === undefined || fleet.trim().length === 0) {
    return 'external';
  }

  const normalized = fleet.trim().toLowerCase();
  if (KNOWN_FLEETS.has(normalized)) {
    return normalized;
  }

  if (CONSOLE_FLEET_LABELS[normalized] !== undefined) {
    return normalized;
  }

  return 'external';
}

export function formatFleetSectionLabel(fleetId: CatalogFleetId): string {
  if (fleetId in FLEET_DISPLAY_NAMES) {
    return FLEET_DISPLAY_NAMES[fleetId as KnownCatalogFleetId];
  }

  const custom = CONSOLE_FLEET_LABELS[fleetId];
  if (custom !== undefined) {
    return custom;
  }

  if (fleetId === 'external') {
    return 'External';
  }

  return fleetId;
}

export interface FleetAgentGroup {
  readonly fleetId: CatalogFleetId;
  readonly agents: readonly AgentObservabilityRecord[];
}

function sortAgentsInFleet(
  agents: readonly AgentObservabilityRecord[],
  activeAgentIds: ReadonlySet<string>,
): AgentObservabilityRecord[] {
  return [...agents].sort((left, right) => {
    const leftActive = activeAgentIds.has(left.id);
    const rightActive = activeAgentIds.has(right.id);
    if (leftActive !== rightActive) {
      return leftActive ? -1 : 1;
    }

    const leftName = left.name.trim().length > 0 ? left.name : left.id;
    const rightName = right.name.trim().length > 0 ? right.name : right.id;
    return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' });
  });
}

/** Group agents into ordered fleet sections for the catalog panel. */
export function groupAgentsByFleet(
  agents: readonly AgentObservabilityRecord[],
  activeAgentIds: ReadonlySet<string> = new Set<string>(),
  options?: { readonly preserveOrder?: boolean },
): readonly FleetAgentGroup[] {
  const order = getCatalogFleetOrder();
  const buckets = new Map<string, AgentObservabilityRecord[]>(
    order.map((fleetId) => [fleetId, []]),
  );

  for (const agent of agents) {
    const fleetId = resolveFleetBucket(agent.fleet);
    if (!buckets.has(fleetId)) {
      buckets.set(fleetId, []);
    }
    buckets.get(fleetId)?.push(agent);
  }

  return order.flatMap((fleetId) => {
    const fleetAgents = buckets.get(fleetId) ?? [];
    if (fleetAgents.length === 0) {
      return [];
    }

    return [
      {
        fleetId,
        agents: options?.preserveOrder
          ? fleetAgents
          : sortAgentsInFleet(fleetAgents, activeAgentIds),
      },
    ];
  });
}
