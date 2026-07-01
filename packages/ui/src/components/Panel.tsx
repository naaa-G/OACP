import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils/cx.js';

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode | undefined;
  readonly headerActions?: ReactNode | undefined;
  readonly bodyClassName?: string | undefined;
}

/** Glass HUD panel with titled header and scrollable body. */
export function Panel({
  title,
  children,
  footer,
  headerActions,
  className,
  bodyClassName,
  id,
  'aria-label': ariaLabel,
  ...rest
}: PanelProps) {
  return (
    <section
      id={id}
      className={cx('oacp-panel', className)}
      aria-label={ariaLabel ?? title}
      {...rest}
    >
      <header className="oacp-panel__header">
        <div className="oacp-panel__headerMain">
          <h2 className="oacp-panel__title">{title}</h2>
          {headerActions !== undefined ? (
            <div className="oacp-panel__headerActions">{headerActions}</div>
          ) : null}
        </div>
      </header>
      <div className={cx('oacp-panel__body', bodyClassName)}>{children}</div>
      {footer !== undefined ? <footer className="oacp-panel__footer">{footer}</footer> : null}
    </section>
  );
}
