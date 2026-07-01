import type { CatalogFleetId } from '../utils/fleet-catalog.js';
import { orbitalBandsForFleets, type ShowcaseFleetOrbitalBand } from './showcase-fleet-bands.js';

/**
 * Enterprise UX: wireframe orbital bands add visual noise for single-fleet operator views.
 * Show bands when multiple fleets are present or during full-screen presentation demos.
 */
export function shouldShowShowcaseOrbitalBands(
  fleetsInGraph: readonly CatalogFleetId[],
  presentationMode: boolean,
): boolean {
  if (fleetsInGraph.length === 0) {
    return false;
  }

  return presentationMode || fleetsInGraph.length > 1;
}

export function resolveShowcaseOrbitalBands(
  fleetsInGraph: readonly CatalogFleetId[],
  presentationMode: boolean,
): readonly ShowcaseFleetOrbitalBand[] {
  if (!shouldShowShowcaseOrbitalBands(fleetsInGraph, presentationMode)) {
    return [];
  }

  return orbitalBandsForFleets(fleetsInGraph);
}
