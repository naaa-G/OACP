/**
 * Elevation and glow — glass HUD panels and active agent highlights.
 */
export const shadows = {
  panel: '0 0 0 1px rgba(255, 255, 255, 0.04) inset',
  panelGlow: '0 0 24px rgba(45, 212, 191, 0.06)',
  focusRing: '0 0 0 2px rgba(45, 212, 191, 0.45)',
  activeAgent: '0 0 0 1px rgba(45, 212, 191, 0.35), 0 0 12px rgba(45, 212, 191, 0.15)',
} as const;

export type ShadowToken = typeof shadows;
