import type { ChangeEvent } from 'react';
import { useCallback } from 'react';

import { SearchInput } from '@oacp/ui';

import type { MessageFeedFilterOptions, MessageFeedFilters } from '../utils/message-feed-filter.js';
import { shortAgentId } from '@oacp/observability-client';

import styles from './MessageFeedFilterBar.module.css';

export interface MessageFeedFilterBarProps {
  readonly filters: MessageFeedFilters;
  readonly options: MessageFeedFilterOptions;
  readonly activeFilterCount: number;
  readonly onChange: (filters: MessageFeedFilters) => void;
  readonly onClear: () => void;
}

function formatAgentLabel(agentId: string): string {
  return shortAgentId(agentId);
}

export function MessageFeedFilterBar({
  filters,
  options,
  activeFilterCount,
  onChange,
  onClear,
}: MessageFeedFilterBarProps) {
  const updateField = useCallback(
    (field: keyof MessageFeedFilters) =>
      (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        onChange({ ...filters, [field]: event.target.value });
      },
    [filters, onChange],
  );

  return (
    <div className={styles.root} data-testid="feed-filter-bar">
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Type</span>
          <select
            className="oacp-select"
            aria-label="Filter by message type"
            data-testid="feed-filter-type"
            value={filters.type}
            onChange={updateField('type')}
          >
            <option value="">All</option>
            {options.types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Agent</span>
          <select
            className="oacp-select"
            aria-label="Filter by agent"
            data-testid="feed-filter-agent"
            value={filters.agent}
            onChange={updateField('agent')}
          >
            <option value="">All</option>
            {options.agents.map((agentId) => (
              <option key={agentId} value={agentId}>
                {formatAgentLabel(agentId)}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Capability</span>
          <select
            className="oacp-select"
            aria-label="Filter by capability"
            data-testid="feed-filter-capability"
            value={filters.capability}
            onChange={updateField('capability')}
          >
            <option value="">All</option>
            {options.capabilities.map((capability) => (
              <option key={capability} value={capability}>
                {capability}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Status</span>
          <select
            className="oacp-select"
            aria-label="Filter by status"
            data-testid="feed-filter-status"
            value={filters.status}
            onChange={updateField('status')}
          >
            <option value="">All</option>
            {options.statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.searchRow}>
        <SearchInput
          aria-label="Filter messages by text"
          data-testid="feed-filter-text"
          placeholder="Search summary, ids, agents…"
          value={filters.text}
          onChange={updateField('text')}
        />
        {activeFilterCount > 0 ? (
          <button
            type="button"
            className={styles.clearButton}
            data-testid="feed-filter-clear"
            onClick={onClear}
          >
            Clear filters ({activeFilterCount})
          </button>
        ) : null}
      </div>
    </div>
  );
}
