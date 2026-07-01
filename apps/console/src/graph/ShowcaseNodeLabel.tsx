import type { ShowcaseGraphLabelView } from './showcase-graph-label.js';
import styles from './ShowcaseNodeLabel.module.css';

export interface ShowcaseNodeLabelProps {
  readonly label: ShowcaseGraphLabelView;
  readonly variant: 'hover' | 'pinned';
  readonly testId: string;
}

export function ShowcaseNodeLabel({ label, variant, testId }: ShowcaseNodeLabelProps) {
  const rootClass = variant === 'pinned' ? styles.pinned : styles.hover;

  return (
    <div
      className={rootClass}
      data-testid={testId}
      role={variant === 'pinned' ? 'status' : 'tooltip'}
    >
      <p className={styles.name}>{label.name}</p>
      <dl className={styles.meta}>
        <div className={styles.row}>
          <dt>Role</dt>
          <dd>{label.role}</dd>
        </div>
        <div className={styles.row}>
          <dt>Fleet</dt>
          <dd>{label.fleet}</dd>
        </div>
        <div className={styles.row}>
          <dt>ID</dt>
          <dd className={styles.mono} title={label.agentId}>
            {label.shortId}
          </dd>
        </div>
      </dl>
      {variant === 'pinned' ? (
        <span className={styles.pinBadge} aria-hidden>
          Selected
        </span>
      ) : null}
    </div>
  );
}
