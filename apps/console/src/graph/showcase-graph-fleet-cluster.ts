import { initialShowcaseForcePosition } from './showcase-graph-force.js';
import { showcaseFleetClusterOffset } from './showcase-fleet-bands.js';
import { resolveFleetBucket, type CatalogFleetId } from '../utils/fleet-catalog.js';

/** Initial 3D position for a node within its fleet cluster (Day 42). */
export function initialShowcaseFleetClusterPosition(
  fleet: string | undefined,
  indexWithinFleet: number,
  fleetNodeCount: number,
  localSpread = 1.55,
): readonly [number, number, number] {
  const [offsetX, offsetY, offsetZ] = showcaseFleetClusterOffset(fleet);
  const [localX, localY, localZ] = initialShowcaseForcePosition(
    indexWithinFleet,
    fleetNodeCount,
    localSpread,
  );

  return [offsetX + localX, offsetY + localY, offsetZ + localZ];
}

export function groupNodesByFleetBucket<T extends { readonly fleet?: string | undefined }>(
  nodes: readonly T[],
): ReadonlyMap<CatalogFleetId, readonly T[]> {
  const groups = new Map<CatalogFleetId, T[]>();

  for (const node of nodes) {
    const bucket = resolveFleetBucket(node.fleet);
    const bucketNodes = groups.get(bucket) ?? [];
    bucketNodes.push(node);
    groups.set(bucket, bucketNodes);
  }

  return groups;
}

export function countDistinctShowcaseFleets(
  nodes: readonly { readonly fleet?: string | undefined }[],
): number {
  return groupNodesByFleetBucket(nodes).size;
}

export function fleetClusterSeparation(
  left: Pick<{ readonly x: number; readonly y: number; readonly z: number }, 'x' | 'y' | 'z'>,
  right: Pick<{ readonly x: number; readonly y: number; readonly z: number }, 'x' | 'y' | 'z'>,
): number {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}
