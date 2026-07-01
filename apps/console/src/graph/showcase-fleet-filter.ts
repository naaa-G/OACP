import {
  CATALOG_FLEET_ORDER,
  resolveFleetBucket,
  type CatalogFleetId,
} from '../utils/fleet-catalog.js';

export const SHOWCASE_FLEET_DIMMED_NODE_OPACITY = 0.16;
export const SHOWCASE_FLEET_DIMMED_EDGE_OPACITY = 0.1;

export function parseShowcaseFleetFilter(value: string | undefined | null): CatalogFleetId | null {
  if (value === undefined || value === null || value.trim().length === 0) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if ((CATALOG_FLEET_ORDER as readonly string[]).includes(normalized)) {
    return normalized;
  }

  return null;
}

export function readShowcaseFleetFilterFromSearch(search: string): string | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get('showcase_fleet') ?? undefined;
}

export function isShowcaseFleetHighlighted(
  fleet: string | undefined,
  filterFleet: CatalogFleetId | null,
): boolean {
  if (filterFleet === null) {
    return true;
  }

  return resolveFleetBucket(fleet) === filterFleet;
}

export function isShowcaseEdgeFleetHighlighted(
  fromFleet: string | undefined,
  toFleet: string | undefined,
  filterFleet: CatalogFleetId | null,
): boolean {
  if (filterFleet === null) {
    return true;
  }

  return (
    resolveFleetBucket(fromFleet) === filterFleet || resolveFleetBucket(toFleet) === filterFleet
  );
}

export function resolveShowcaseFleetDimmedOpacity(
  highlighted: boolean,
  baseOpacity: number,
): number {
  return highlighted ? baseOpacity : SHOWCASE_FLEET_DIMMED_EDGE_OPACITY;
}

export function resolveShowcaseFleetDimmedNodeOpacity(highlighted: boolean): number {
  return highlighted ? 1 : SHOWCASE_FLEET_DIMMED_NODE_OPACITY;
}
