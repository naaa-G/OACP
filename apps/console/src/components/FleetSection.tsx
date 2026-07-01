import type { ReactNode } from 'react';

import type { CatalogFleetId } from '../utils/fleet-catalog.js';
import { formatFleetSectionLabel } from '../utils/fleet-catalog.js';
import styles from './FleetSection.module.css';

function fleetRingClass(fleetId: CatalogFleetId): string {
  switch (fleetId) {
    case 'mcplab':
      return styles.ringMcplab ?? '';
    case 'startup-demo':
      return styles.ringStartup ?? '';
    case 'system':
      return styles.ringSystem ?? '';
    case 'external':
      return styles.ringExternal ?? '';
    default:
      return styles.ringExternal ?? '';
  }
}

export interface FleetSectionProps {
  readonly fleetId: CatalogFleetId;
  readonly agentCount: number;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly children: ReactNode;
}

export function FleetSection({
  fleetId,
  agentCount,
  collapsed,
  onToggle,
  children,
}: FleetSectionProps) {
  const sectionId = `fleet-section-${fleetId}`;
  const label = formatFleetSectionLabel(fleetId);

  return (
    <section
      className={styles.section}
      data-fleet-id={fleetId}
      data-testid={`fleet-section-${fleetId}`}
      aria-labelledby={sectionId}
    >
      <button
        id={sectionId}
        type="button"
        className={`${styles.header} ${fleetRingClass(fleetId)}`}
        aria-expanded={!collapsed}
        aria-controls={`${sectionId}-list`}
        data-testid={`fleet-header-${fleetId}`}
        onClick={onToggle}
      >
        <span
          className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ''}`}
          aria-hidden
        />
        <span className={styles.title}>{label}</span>
        <span className={styles.count} data-testid={`fleet-count-${fleetId}`}>
          {agentCount}
        </span>
      </button>

      {!collapsed ? (
        <ul id={`${sectionId}-list`} className={styles.list} aria-label={`${label} agents`}>
          {children}
        </ul>
      ) : null}
    </section>
  );
}
