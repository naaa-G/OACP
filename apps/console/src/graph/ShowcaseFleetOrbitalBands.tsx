import type { ShowcaseFleetOrbitalBand } from './showcase-fleet-bands.js';

export interface ShowcaseFleetOrbitalBandsProps {
  readonly bands: readonly ShowcaseFleetOrbitalBand[];
}

function ShowcaseOrbitalRing({ band }: { readonly band: ShowcaseFleetOrbitalBand }) {
  return (
    <mesh frustumCulled={false} userData={{ fleetId: band.fleetId }}>
      <sphereGeometry args={[band.radius, 56, 56]} />
      <meshBasicMaterial
        wireframe
        color={band.color}
        transparent
        opacity={band.opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Fleet-colored orbital bands — cyan MCPLab inner, amber startup outer (Day 42). */
export function ShowcaseFleetOrbitalBands({ bands }: ShowcaseFleetOrbitalBandsProps) {
  return (
    <group data-testid="showcase-fleet-orbital-bands">
      {bands.map((band) => (
        <group key={band.fleetId} data-fleet-band={band.fleetId}>
          <ShowcaseOrbitalRing band={band} />
        </group>
      ))}
    </group>
  );
}
