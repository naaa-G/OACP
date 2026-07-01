import type { AgentObservabilityRecord } from '@oacp/observability-client';

import type {
  AgentCatalogFilters,
  AgentCatalogSort,
  AgentCatalogStatusFilter,
} from '../utils/agent-catalog-filter.js';
import { listAvailableFleetFilters } from '../utils/agent-catalog-filter.js';
import { formatFleetSectionLabel, type CatalogFleetId } from '../utils/fleet-catalog.js';
import styles from './AgentCatalogToolbar.module.css';

const STATUS_FILTERS: readonly AgentCatalogStatusFilter[] = ['active', 'idle', 'error'];

const SORT_OPTIONS: readonly { readonly value: AgentCatalogSort; readonly label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'last_seen', label: 'Last seen' },
  { value: 'activity', label: 'Activity in trace' },
];

export interface AgentCatalogToolbarProps {
  readonly agents: readonly AgentObservabilityRecord[];
  readonly filters: AgentCatalogFilters;
  readonly onToggleStatus: (status: AgentCatalogStatusFilter) => void;
  readonly onToggleFleet: (fleet: CatalogFleetId) => void;
  readonly onToggleInTraceOnly: () => void;
  readonly onSortChange: (sort: AgentCatalogSort) => void;
  readonly onClearFilters: () => void;
  readonly traceSelected: boolean;
}

function FilterChip({
  label,
  pressed,
  onClick,
  testId,
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly onClick: () => void;
  readonly testId: string;
}) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${pressed ? styles.chipActive : ''}`}
      aria-pressed={pressed}
      data-testid={testId}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function AgentCatalogToolbar({
  agents,
  filters,
  onToggleStatus,
  onToggleFleet,
  onToggleInTraceOnly,
  onSortChange,
  onClearFilters,
  traceSelected,
}: AgentCatalogToolbarProps) {
  const fleetOptions = listAvailableFleetFilters(agents);
  const hasActiveFilters =
    filters.statuses.length > 0 ||
    filters.fleet !== null ||
    filters.inTraceOnly ||
    filters.sort !== 'name';

  return (
    <div className={styles.toolbar} data-testid="agents-catalog-toolbar">
      <div className={styles.group} role="group" aria-label="Status filters">
        <span className={styles.groupLabel}>Status</span>
        <div className={styles.chips}>
          {STATUS_FILTERS.map((status) => (
            <FilterChip
              key={status}
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              pressed={filters.statuses.includes(status)}
              onClick={() => {
                onToggleStatus(status);
              }}
              testId={`filter-status-${status}`}
            />
          ))}
        </div>
      </div>

      <div className={styles.group} role="group" aria-label="Fleet filters">
        <span className={styles.groupLabel}>Fleet</span>
        <div className={styles.chips}>
          {fleetOptions.map((fleetId) => (
            <FilterChip
              key={fleetId}
              label={formatFleetSectionLabel(fleetId)}
              pressed={filters.fleet === fleetId}
              onClick={() => {
                onToggleFleet(fleetId);
              }}
              testId={`filter-fleet-${fleetId}`}
            />
          ))}
        </div>
      </div>

      {traceSelected ? (
        <div className={styles.group} role="group" aria-label="Trace filters">
          <span className={styles.groupLabel}>Trace</span>
          <div className={styles.chips}>
            <FilterChip
              label="In trace"
              pressed={filters.inTraceOnly}
              onClick={onToggleInTraceOnly}
              testId="filter-in-trace"
            />
          </div>
        </div>
      ) : null}

      <div className={styles.sortWrap}>
        <label className={styles.sortLabel} htmlFor="agents-sort-select">
          Sort
        </label>
        <select
          id="agents-sort-select"
          className="oacp-select"
          value={filters.sort}
          data-testid="agents-sort-select"
          aria-label="Sort agents"
          onChange={(event) => {
            onSortChange(event.target.value as AgentCatalogSort);
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters ? (
        <button
          type="button"
          className={styles.clearButton}
          data-testid="agents-clear-filters"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
