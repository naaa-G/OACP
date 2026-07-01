import styles from './PinnedSectionHeader.module.css';

export interface PinnedSectionHeaderProps {
  readonly agentCount: number;
}

export function PinnedSectionHeader({ agentCount }: PinnedSectionHeaderProps) {
  return (
    <div
      className={styles.header}
      data-testid="pinned-section-header"
      aria-label={`Pinned agents, ${agentCount}`}
    >
      <span className={styles.pinIcon} aria-hidden>
        📌
      </span>
      <span className={styles.title}>Pinned</span>
      <span className={styles.count} data-testid="pinned-section-count">
        {agentCount}
      </span>
    </div>
  );
}
