export { colors, type ColorToken, type FleetId } from './colors.js';
export { typography, type TypographyToken } from './typography.js';
export { spacing, layout, type SpacingToken, type LayoutToken } from './spacing.js';
export { motion, type MotionToken } from './motion.js';
export { shadows, type ShadowToken } from './shadows.js';

import { colors } from './colors.js';
import { typography } from './typography.js';
import { spacing, layout } from './spacing.js';
import { motion } from './motion.js';
import { shadows } from './shadows.js';

/** Combined design token object for programmatic access and docs tooling. */
export const tokens = {
  colors,
  typography,
  spacing,
  layout,
  motion,
  shadows,
} as const;

export type DesignTokens = typeof tokens;
