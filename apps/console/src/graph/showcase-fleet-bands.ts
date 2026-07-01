import {
  formatFleetSectionLabel,
  getCatalogFleetOrder,
  resolveFleetBucket,
  type CatalogFleetId,
  type KnownCatalogFleetId,
} from '../utils/fleet-catalog.js';
import { SHOWCASE_FLEET_COLORS } from './showcase-fleet-colors.js';
import {
  SHOWCASE_INNER_BAND_RADIUS,
  SHOWCASE_OUTER_BAND_RADIUS,
} from './showcase-graph-sphere-layout.js';

export interface ShowcaseFleetOrbitalBand {
  readonly fleetId: CatalogFleetId;
  readonly label: string;
  readonly color: string;
  readonly radius: number;
  readonly opacity: number;
}

/** Orbital band styling for showcase fleet clusters (Day 42). */
export const SHOWCASE_FLEET_ORBITAL_BANDS: Record<KnownCatalogFleetId, ShowcaseFleetOrbitalBand> = {
  mcplab: {
    fleetId: 'mcplab',
    label: formatFleetSectionLabel('mcplab'),
    color: SHOWCASE_FLEET_COLORS.mcplab ?? '#5eead4',
    radius: SHOWCASE_INNER_BAND_RADIUS,
    opacity: 0.24,
  },
  'startup-demo': {
    fleetId: 'startup-demo',
    label: formatFleetSectionLabel('startup-demo'),
    color: SHOWCASE_FLEET_COLORS['startup-demo'] ?? '#fbbf24',
    radius: SHOWCASE_OUTER_BAND_RADIUS,
    opacity: 0.22,
  },
  system: {
    fleetId: 'system',
    label: formatFleetSectionLabel('system'),
    color: SHOWCASE_FLEET_COLORS.system ?? '#93c5fd',
    radius: SHOWCASE_INNER_BAND_RADIUS + 0.45,
    opacity: 0.14,
  },
  external: {
    fleetId: 'external',
    label: formatFleetSectionLabel('external'),
    color: SHOWCASE_FLEET_COLORS.external ?? '#a78bfa',
    radius: SHOWCASE_OUTER_BAND_RADIUS + 0.35,
    opacity: 0.12,
  },
};

export const SHOWCASE_FLEET_CLUSTER_OFFSETS: Record<
  KnownCatalogFleetId,
  readonly [number, number, number]
> = {
  mcplab: [-2.4, 0.5, 0.2],
  'startup-demo': [2.4, -0.5, -0.2],
  system: [0, 2.6, -1.4],
  external: [0, -2.6, 1.4],
};

const DEFAULT_CLUSTER_OFFSET: readonly [number, number, number] = [0, 0, 0];

export function showcaseFleetClusterOffset(
  fleet: string | undefined,
): readonly [number, number, number] {
  const bucket = resolveFleetBucket(fleet);
  if (bucket in SHOWCASE_FLEET_CLUSTER_OFFSETS) {
    return SHOWCASE_FLEET_CLUSTER_OFFSETS[bucket as KnownCatalogFleetId];
  }
  return DEFAULT_CLUSTER_OFFSET;
}

export function listShowcaseFleetsInGraph(
  nodes: readonly { readonly fleet?: string | undefined }[],
): readonly CatalogFleetId[] {
  const present = new Set<CatalogFleetId>();
  for (const node of nodes) {
    present.add(resolveFleetBucket(node.fleet));
  }

  return getCatalogFleetOrder().filter((fleetId) => present.has(fleetId));
}

export function orbitalBandForFleet(fleetId: CatalogFleetId): ShowcaseFleetOrbitalBand {
  if (fleetId in SHOWCASE_FLEET_ORBITAL_BANDS) {
    return SHOWCASE_FLEET_ORBITAL_BANDS[fleetId as KnownCatalogFleetId];
  }

  return {
    fleetId,
    label: formatFleetSectionLabel(fleetId),
    color: SHOWCASE_FLEET_COLORS.external ?? '#a78bfa',
    radius: SHOWCASE_OUTER_BAND_RADIUS,
    opacity: 0.16,
  };
}

export function orbitalBandsForFleets(
  fleetIds: readonly CatalogFleetId[],
): readonly ShowcaseFleetOrbitalBand[] {
  return fleetIds.map((fleetId) => orbitalBandForFleet(fleetId));
}
