import { graphModeLabel, type GraphMode } from '../config/graph-mode.js';
import styles from './GraphModeToggle.module.css';

export interface GraphModeToggleProps {
  readonly mode: GraphMode;
  readonly onModeChange: (mode: GraphMode) => void;
}

const TOGGLE_MODES = ['ops', 'showcase'] as const satisfies readonly GraphMode[];

/** Switch Ops 2D ↔ Showcase 3D without page reload (Day 36). */
export function GraphModeToggle({ mode, onModeChange }: GraphModeToggleProps) {
  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label="Graph mode"
      data-testid="graph-mode-toggle"
    >
      {TOGGLE_MODES.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.button}
          data-testid={`graph-mode-${option}`}
          aria-pressed={mode === option}
          onClick={() => {
            onModeChange(option);
          }}
        >
          {graphModeLabel(option)}
        </button>
      ))}
    </div>
  );
}
