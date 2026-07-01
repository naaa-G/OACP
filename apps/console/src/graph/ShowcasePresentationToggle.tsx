import styles from './ShowcasePresentationToggle.module.css';

export interface ShowcasePresentationToggleProps {
  readonly traceCycleEnabled: boolean;
  readonly onTraceCycleChange: (enabled: boolean) => void;
  readonly onEnterPresentation: () => void;
  readonly disabled?: boolean | undefined;
}

/** Enter full-screen presentation mode from Showcase graph toolbar (Day 43). */
export function ShowcasePresentationToggle({
  traceCycleEnabled,
  onTraceCycleChange,
  onEnterPresentation,
  disabled = false,
}: ShowcasePresentationToggleProps) {
  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label="Showcase presentation mode"
      data-testid="showcase-presentation-controls"
    >
      <button
        type="button"
        className={styles.button}
        data-testid="showcase-presentation-cycle"
        aria-pressed={traceCycleEnabled}
        aria-label="Auto-cycle traces during presentation"
        disabled={disabled}
        title="Rotate traces every 60 seconds while presenting"
        onClick={() => {
          onTraceCycleChange(!traceCycleEnabled);
        }}
      >
        Cycle
      </button>
      <button
        type="button"
        className={styles.buttonPresent}
        data-testid="showcase-presentation-enter"
        aria-label="Enter full-screen presentation mode. Press Escape to exit."
        disabled={disabled}
        onClick={onEnterPresentation}
      >
        Present
      </button>
    </div>
  );
}
