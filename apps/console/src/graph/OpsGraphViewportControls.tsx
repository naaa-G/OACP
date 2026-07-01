import styles from './OpsGraphViewportControls.module.css';

export interface OpsGraphViewportControlsProps {
  readonly onFitView: () => void;
  readonly onResetView: () => void;
}

/** Compact viewport actions for the delegation graph panel header (Day 31). */
export function OpsGraphViewportControls({
  onFitView,
  onResetView,
}: OpsGraphViewportControlsProps) {
  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label="Graph viewport controls"
      data-testid="ops-graph-viewport-controls"
    >
      <button
        type="button"
        className={styles.button}
        data-testid="ops-graph-fit-view"
        title="Fit entire trace to view"
        aria-label="Fit entire trace to view"
        onClick={onFitView}
      >
        <span className={styles.icon} aria-hidden>
          ⤢
        </span>
        Fit view
      </button>
      <button
        type="button"
        className={styles.button}
        data-testid="ops-graph-reset-view"
        title="Reset view to default framing"
        aria-label="Reset view to default framing"
        onClick={onResetView}
      >
        <span className={styles.icon} aria-hidden>
          ↺
        </span>
        Reset
      </button>
    </div>
  );
}
