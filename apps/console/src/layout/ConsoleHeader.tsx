import type { ChangeEvent } from 'react';
import { useCallback } from 'react';

import type { ConnectionStatus } from '@oacp/observability-client';
import { SNAPSHOT_RECONCILE_INTERVAL_OPTIONS } from '@oacp/observability-client';
import { Badge, Button, Toggle } from '@oacp/ui';

import styles from './ConsoleHeader.module.css';

/** @deprecated Use SNAPSHOT_RECONCILE_INTERVAL_OPTIONS from @oacp/observability-client */
export const POLL_INTERVAL_OPTIONS = SNAPSHOT_RECONCILE_INTERVAL_OPTIONS;

export interface ConsoleHeaderProps {
  readonly liveEnabled: boolean;
  readonly reconcileIntervalMs: number;
  readonly onLiveChange: (enabled: boolean) => void;
  readonly onReconcileIntervalChange: (ms: number) => void;
  readonly onRefresh: () => void;
  readonly isRefreshing?: boolean | undefined;
  readonly connectionStatus?: ConnectionStatus | undefined;
  readonly selectedAgentId?: string | undefined;
  readonly selectedAgentLabel?: string | undefined;
  readonly onClearSelection?: (() => void) | undefined;
}

function connectionBadge(status: ConnectionStatus | undefined) {
  switch (status) {
    case 'connected':
      return <Badge variant="success">Connected</Badge>;
    case 'reconnecting':
      return <Badge variant="warning">Reconnecting</Badge>;
    case 'offline':
      return <Badge variant="error">Offline</Badge>;
    default:
      return <Badge variant="warning">Reconnecting</Badge>;
  }
}

export function ConsoleHeader({
  liveEnabled,
  reconcileIntervalMs,
  onLiveChange,
  onReconcileIntervalChange,
  onRefresh,
  isRefreshing = false,
  connectionStatus = 'reconnecting',
  selectedAgentId,
  selectedAgentLabel,
  onClearSelection,
}: ConsoleHeaderProps) {
  const handleReconcileChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onReconcileIntervalChange(Number.parseInt(event.target.value, 10));
    },
    [onReconcileIntervalChange],
  );

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1 className={styles.title}>OACP Console</h1>
        <p className={styles.subtitle}>Live agent graph, message flow, and delegation topology</p>
      </div>

      <div className="oacp-header-actions">
        <Badge variant={liveEnabled ? 'live' : 'paused'}>{liveEnabled ? 'Live' : 'Paused'}</Badge>

        {connectionBadge(connectionStatus)}

        <Toggle
          label="Live"
          checked={liveEnabled}
          onChange={(event) => {
            onLiveChange(event.target.checked);
          }}
        />

        <select
          className="oacp-select"
          aria-label="Snapshot reconcile interval"
          title="Live messages arrive via SSE. Snapshot reconciles agent registry, traces, and graph drift."
          value={reconcileIntervalMs}
          onChange={handleReconcileChange}
          disabled={!liveEnabled}
          data-testid="header-reconcile-interval"
        >
          {SNAPSHOT_RECONCILE_INTERVAL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Reconcile {option.label}
            </option>
          ))}
        </select>

        <Button variant="ghost" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </Button>

        {selectedAgentId !== undefined && onClearSelection !== undefined ? (
          <Button
            variant="ghost"
            data-testid="header-clear-selection"
            aria-label={`Clear selection for ${selectedAgentLabel ?? selectedAgentId}`}
            onClick={onClearSelection}
          >
            Clear selection
          </Button>
        ) : null}
      </div>
    </header>
  );
}
