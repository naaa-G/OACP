/**
 * Typography scale for OACP Console — UI sans + monospace for IDs and telemetry.
 */
export const typography = {
  fontFamily: {
    sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, 'Cascadia Code', 'Segoe UI Mono', Consolas, monospace",
  },
  fontSize: {
    xs: '0.6875rem',
    sm: '0.8125rem',
    base: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.45',
    relaxed: '1.6',
  },
  letterSpacing: {
    tight: '-0.01em',
    normal: '0',
    wide: '0.04em',
    wider: '0.06em',
  },
} as const;

export type TypographyToken = typeof typography;
