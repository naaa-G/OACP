import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils/cx.js';

export type ButtonVariant = 'primary' | 'ghost' | 'default';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
}

/** Action button — primary, ghost, or default surface styles. */
export function Button({
  children,
  variant = 'default',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cx('oacp-btn', `oacp-btn--${variant}`, className)} {...rest}>
      {children}
    </button>
  );
}
