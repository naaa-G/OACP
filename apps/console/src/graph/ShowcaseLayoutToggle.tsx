import {
  showcaseLayoutKindLabel,
  type ShowcaseGraphLayoutKind,
} from './showcase-graph-layout-kind.js';
import styles from './ShowcaseLayoutToggle.module.css';

export interface ShowcaseLayoutToggleProps {
  readonly layoutKind: ShowcaseGraphLayoutKind;
  readonly onLayoutKindChange: (layoutKind: ShowcaseGraphLayoutKind) => void;
}

const TOGGLE_LAYOUTS = ['force', 'sphere'] as const satisfies readonly ShowcaseGraphLayoutKind[];

/** Switch Force ↔ Sphere constellation layout in Showcase 3D (Day 38). */
export function ShowcaseLayoutToggle({
  layoutKind,
  onLayoutKindChange,
}: ShowcaseLayoutToggleProps) {
  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label="Showcase layout"
      data-testid="showcase-layout-toggle"
    >
      {TOGGLE_LAYOUTS.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.button}
          data-testid={`showcase-layout-${option}`}
          aria-pressed={layoutKind === option}
          onClick={() => {
            onLayoutKindChange(option);
          }}
        >
          {showcaseLayoutKindLabel(option)}
        </button>
      ))}
    </div>
  );
}
