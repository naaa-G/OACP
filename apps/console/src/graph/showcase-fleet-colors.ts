/** Fleet palette for Showcase 3D nodes — mirrors `--oacp-fleet-*` theme tokens. */
export const SHOWCASE_FLEET_COLORS: Record<string, string> = {
  mcplab: '#5eead4',
  'startup-demo': '#fbbf24',
  system: '#93c5fd',
  external: '#a78bfa',
};

export const SHOWCASE_FLEET_COLOR_DEFAULT = '#7dd3fc';

export function showcaseFleetColor(fleet: string | undefined): string {
  if (fleet === undefined) {
    return SHOWCASE_FLEET_COLOR_DEFAULT;
  }
  return SHOWCASE_FLEET_COLORS[fleet] ?? SHOWCASE_FLEET_COLOR_DEFAULT;
}
