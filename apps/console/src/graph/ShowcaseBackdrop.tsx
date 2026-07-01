import { Grid, Stars } from '@react-three/drei';

export interface ShowcaseBackdropProps {
  readonly animateStars: boolean;
}

/** Subtle starfield + hex grid mission-control backdrop (Day 41). */
export function ShowcaseBackdrop({ animateStars }: ShowcaseBackdropProps) {
  return (
    <group>
      <Stars
        radius={90}
        depth={45}
        count={1400}
        factor={2.2}
        saturation={0}
        fade
        speed={animateStars ? 0.35 : 0}
      />
      <Grid
        infiniteGrid
        position={[0, -5.5, 0]}
        args={[10.5, 10.5]}
        cellSize={0.62}
        sectionSize={3.1}
        fadeDistance={34}
        fadeStrength={1.35}
        cellColor="#1a2838"
        sectionColor="#2a3d52"
        cellThickness={0.55}
        sectionThickness={0.9}
      />
    </group>
  );
}
