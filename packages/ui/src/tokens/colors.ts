/**
 * OACP Console color tokens — HUD / mission-control palette.
 * Source of truth for TypeScript consumers; mirrored in theme.css as CSS variables.
 */
export const colors = {
  /** Deep space background */
  bg: '#0b0f14',
  bgElevated: '#0f141c',
  panel: '#141b26',
  panel2: '#1a2332',
  border: '#2a364a',
  borderSubtle: '#1e2838',

  text: '#e8edf5',
  textMuted: '#8b9cb3',
  textDim: '#5c6b82',

  /** Primary accent — electric cyan (Showcase / active state) */
  accent: '#2dd4bf',
  accentHover: '#5eead4',
  accentDim: 'rgba(45, 212, 191, 0.12)',
  accentGlow: 'rgba(45, 212, 191, 0.35)',

  /** Secondary accent — protocol blue (links, info) */
  blue: '#5b9cf5',
  blueDim: 'rgba(91, 156, 245, 0.15)',
  pulse: '#7ec8ff',

  success: '#3dd68c',
  successDim: 'rgba(61, 214, 140, 0.12)',
  warning: '#f5a623',
  warningDim: 'rgba(245, 166, 35, 0.12)',
  error: '#f07178',
  errorDim: 'rgba(240, 113, 120, 0.12)',

  /** Graph node states */
  nodeIdle: '#3a4a63',
  nodeActive: '#2dd4bf',
  edge: '#4a5f7a',

  /** Fleet identity rings (agent catalog) */
  fleet: {
    mcplab: '#2dd4bf',
    startupDemo: '#f5a623',
    system: '#8b9cb3',
    external: '#a78bfa',
  },
} as const;

export type ColorToken = typeof colors;
export type FleetId = keyof typeof colors.fleet;
