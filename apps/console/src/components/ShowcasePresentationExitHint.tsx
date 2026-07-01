import styles from './ShowcasePresentationExitHint.module.css';

export interface ShowcasePresentationExitHintProps {
  readonly cycleEnabled?: boolean | undefined;
}

/** Floating hint for conference / kiosk presentation mode (Day 43). */
export function ShowcasePresentationExitHint({
  cycleEnabled = false,
}: ShowcasePresentationExitHintProps) {
  return (
    <div
      className={styles.root}
      data-testid="showcase-presentation-exit-hint"
      role="status"
      aria-live="polite"
    >
      <span className={styles.label}>Presentation{cycleEnabled ? ' · auto-cycle' : ''}</span>
      <kbd className={styles.key}>Esc</kbd>
      <span className={styles.label}>to exit</span>
    </div>
  );
}
