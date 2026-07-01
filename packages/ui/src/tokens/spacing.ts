/**
 * Spacing scale — 4px base grid for consistent Console layout density.
 */
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
} as const;

/** Layout regions (Console shell) */
export const layout = {
  headerHeight: '4.5rem',
  traceRailHeight: '11.25rem',
  sidebarWidth: '16.25rem',
  feedWidth: '20rem',
  breakpointLg: '68.75rem',
  panelRadius: '0.625rem',
  controlRadius: '0.375rem',
} as const;

export type SpacingToken = typeof spacing;
export type LayoutToken = typeof layout;
