import { Component, type ErrorInfo, type ReactNode } from 'react';

import { consoleDebug } from '../utils/console-debug.js';
import styles from './ConsoleErrorBoundary.module.css';

export interface ConsoleErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ConsoleErrorBoundaryState {
  readonly error: Error | undefined;
}

/** Catches render errors in the Console shell — Day 14 enterprise safety net. */
export class ConsoleErrorBoundary extends Component<
  ConsoleErrorBoundaryProps,
  ConsoleErrorBoundaryState
> {
  constructor(props: ConsoleErrorBoundaryProps) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: Error): ConsoleErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[OACP Console] render error', error, info.componentStack);
    consoleDebug('error.boundary', {
      message: error.message,
      stack: error.stack?.slice(0, 400) ?? null,
      componentStack: info.componentStack?.slice(0, 400) ?? null,
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleRetry = (): void => {
    this.setState({ error: undefined });
  };

  override render(): ReactNode {
    const { error } = this.state;

    if (error !== undefined) {
      return (
        <div className={styles.fallback} role="alert">
          <h1 className={styles.title}>Console encountered an error</h1>
          <p className={styles.message}>{error.message}</p>
          <p className={styles.hint}>
            The observability layout failed to render. Retry to remount the UI or reload the page.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={this.handleRetry}>
              Retry
            </button>
            <button type="button" className={styles.secondary} onClick={this.handleReload}>
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
