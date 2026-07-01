import type { AgentCatalogDensity } from '../hooks/useAgentCatalogDensity.js';
import styles from './AgentDensityToggle.module.css';

export interface AgentDensityToggleProps {
  readonly density: AgentCatalogDensity;
  readonly onChange: (density: AgentCatalogDensity) => void;
}

export function AgentDensityToggle({ density, onChange }: AgentDensityToggleProps) {
  return (
    <div
      className={styles.toggle}
      role="group"
      aria-label="Agent list density"
      data-testid="agents-density-toggle"
    >
      <button
        type="button"
        className={`${styles.option} ${density === 'compact' ? styles.optionActive : ''}`}
        aria-pressed={density === 'compact'}
        data-testid="agents-density-compact"
        onClick={() => {
          onChange('compact');
        }}
      >
        Compact
      </button>
      <button
        type="button"
        className={`${styles.option} ${density === 'detailed' ? styles.optionActive : ''}`}
        aria-pressed={density === 'detailed'}
        data-testid="agents-density-detailed"
        onClick={() => {
          onChange('detailed');
        }}
      >
        Detailed
      </button>
    </div>
  );
}
