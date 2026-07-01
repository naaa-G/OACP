import type { ObservabilityErrorDetails } from '@oacp/observability-client';

import styles from './ErrorBanner.module.css';

export interface ErrorBannerProps {
  readonly details: ObservabilityErrorDetails;
  readonly onDismiss?: (() => void) | undefined;
  readonly onRetry?: (() => void) | undefined;
}

export function ErrorBanner({ details, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <div
      className={styles.banner}
      role="alert"
      aria-live="assertive"
      data-testid="global-error-banner"
    >
      <div className={styles.content}>
        <strong className={styles.title}>{details.title}</strong>
        <p className={styles.message}>{details.message}</p>
        <p className={styles.hint}>{details.hint}</p>
      </div>
      <div className={styles.actions}>
        {onRetry !== undefined ? (
          <button type="button" className={styles.retry} onClick={onRetry}>
            Retry
          </button>
        ) : null}
        {onDismiss !== undefined ? (
          <button type="button" className={styles.dismiss} onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
