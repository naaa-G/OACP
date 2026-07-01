import type { ReactNode } from 'react';

import { cx } from '../utils/cx.js';

export type BadgeVariant = 'default' | 'live' | 'paused' | 'success' | 'warning' | 'error';

export interface BadgeProps {
  readonly children: ReactNode;
  readonly variant?: BadgeVariant;
  readonly className?: string;
}

/** Compact status pill for connection state and labels. */
export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return <span className={cx('oacp-badge', `oacp-badge--${variant}`, className)}>{children}</span>;
}
