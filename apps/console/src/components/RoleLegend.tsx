import type { RoleLegendEntry } from '../utils/role-taxonomy.js';
import { RoleBadge } from './RoleBadge.js';
import styles from './RoleLegend.module.css';

export interface RoleLegendProps {
  readonly entries: readonly RoleLegendEntry[];
}

export function RoleLegend({ entries }: RoleLegendProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={styles.legend} data-testid="agents-role-legend" aria-label="Role legend">
      <span className={styles.title}>Roles in view</span>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={`${entry.fleetId}:${entry.role.id}`}>
            <RoleBadge role={entry.role} fleetId={entry.fleetId} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}
