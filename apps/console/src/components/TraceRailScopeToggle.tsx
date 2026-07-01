import type { TraceRailScope } from '../utils/trace-rail-scope.js';
import styles from './TraceRailScopeToggle.module.css';

export interface TraceRailScopeToggleProps {
  readonly scope: TraceRailScope;
  readonly onScopeChange: (scope: TraceRailScope) => void;
}

export function TraceRailScopeToggle({ scope, onScopeChange }: TraceRailScopeToggleProps) {
  return (
    <div className={styles.root} role="group" aria-label="Trace list scope">
      <button
        type="button"
        className={scope === 'all' ? styles.active : styles.button}
        aria-pressed={scope === 'all'}
        data-testid="trace-scope-all"
        onClick={() => {
          onScopeChange('all');
        }}
      >
        All synced
      </button>
      <button
        type="button"
        className={scope === 'live' ? styles.active : styles.button}
        aria-pressed={scope === 'live'}
        data-testid="trace-scope-live"
        onClick={() => {
          onScopeChange('live');
        }}
      >
        Live only
      </button>
    </div>
  );
}
