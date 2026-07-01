import type { CatalogFleetId } from '../utils/fleet-catalog.js';
import type { ResolvedAgentRole } from '../utils/role-taxonomy.js';
import { roleToneStyleKey } from '../utils/role-taxonomy.js';
import styles from './RoleBadge.module.css';

export interface RoleBadgeProps {
  readonly role: ResolvedAgentRole;
  readonly fleetId: CatalogFleetId;
  readonly compact?: boolean | undefined;
}

function toneClass(fleetId: CatalogFleetId, tone: number): string {
  const key = roleToneStyleKey(fleetId, tone);
  return (styles as Record<string, string>)[key] ?? styles.externalTone1 ?? '';
}

export function RoleBadge({ role, fleetId, compact = true }: RoleBadgeProps) {
  const tone = toneClass(fleetId, role.tone);
  const inferredHint =
    role.source === 'capability'
      ? ' (inferred from capability)'
      : role.source === 'identity'
        ? ' (inferred from identity)'
        : '';

  return (
    <span
      className={`${styles.badge} ${compact ? styles.compact : styles.detailed} ${tone}`}
      data-role-id={role.id}
      data-role-source={role.source}
      data-testid="agent-role-badge"
      title={`${role.label}${inferredHint}`}
    >
      <span className={styles.glyph} aria-hidden>
        {role.glyph}
      </span>
      <span className={styles.label}>{role.label}</span>
    </span>
  );
}
