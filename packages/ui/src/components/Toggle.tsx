import type { InputHTMLAttributes } from 'react';

import { cx } from '../utils/cx.js';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  readonly label: string;
}

/** Labeled checkbox toggle (e.g. Live refresh). */
export function Toggle({ label, className, id, ...rest }: ToggleProps) {
  const inputId = id ?? `oacp-toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <label className={cx('oacp-toggle', className)} htmlFor={inputId}>
      <input id={inputId} type="checkbox" className="oacp-toggle__input" {...rest} />
      <span className="oacp-toggle__label">{label}</span>
    </label>
  );
}
