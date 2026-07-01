import { useEffect, useMemo, useRef } from 'react';

import type { TraceListEntry } from '@oacp/observability-client';
import { Panel } from '@oacp/ui';

import { TraceRailRow } from '../components/TraceRailRow.js';
import { TraceRailScopeToggle } from '../components/TraceRailScopeToggle.js';
import { filterTracesByScope, type TraceRailScope } from '../utils/trace-rail-scope.js';
import styles from './TraceRail.module.css';

export interface TraceRailProps {
  readonly traces?: readonly TraceListEntry[] | undefined;
  readonly selectedTraceId?: string | undefined;
  readonly traceCount?: number | undefined;
  readonly isLoading?: boolean | undefined;
  readonly isReconnecting?: boolean | undefined;
  readonly isOffline?: boolean | undefined;
  readonly scope?: TraceRailScope | undefined;
  readonly onScopeChange?: ((scope: TraceRailScope) => void) | undefined;
  readonly onSelectTrace?: ((traceId: string) => void) | undefined;
}

export function TraceRail({
  traces = [],
  selectedTraceId,
  traceCount = 0,
  isLoading = false,
  isReconnecting = false,
  isOffline = false,
  scope = 'all',
  onScopeChange,
  onSelectTrace,
}: TraceRailProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const visibleTraces = useMemo(() => filterTracesByScope(traces, scope), [traces, scope]);
  const showEmpty = !isLoading && !isReconnecting && visibleTraces.length === 0;
  const showList = !isLoading && !isReconnecting && visibleTraces.length > 0;

  const headerActions =
    onScopeChange !== undefined ? (
      <TraceRailScopeToggle scope={scope} onScopeChange={onScopeChange} />
    ) : undefined;

  // Keep the selected row visible when switching traces or on deep link load.
  useEffect(() => {
    if (selectedTraceId === undefined || listRef.current === null) {
      return;
    }

    const selectedRow = listRef.current.querySelector<HTMLElement>(`button[aria-current="true"]`);
    selectedRow?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedTraceId, visibleTraces.length]);

  const footer =
    scope === 'live' && traces.length > visibleTraces.length ? (
      <p className={styles.footerNote}>
        Showing {visibleTraces.length} live of {traces.length} traces
      </p>
    ) : traceCount > traces.length ? (
      <p className={styles.footerNote}>
        Showing {traces.length} of {traceCount} traces
      </p>
    ) : undefined;

  return (
    <Panel
      id="tracePanel"
      title="Recent traces"
      headerActions={headerActions}
      bodyClassName={styles.body}
      footer={footer}
      aria-label="Recent traces"
      aria-busy={isLoading}
    >
      {isLoading && !isReconnecting ? <p className="oacp-empty">Loading traces…</p> : null}
      {isReconnecting ? (
        <p className="oacp-empty" role="status" data-testid="trace-reconnecting">
          Reconnecting to OACP server…
        </p>
      ) : null}
      {showEmpty ? (
        <p className="oacp-empty" data-testid="trace-empty-state">
          {isOffline
            ? 'Cannot load traces while the OACP server is offline.'
            : scope === 'live'
              ? 'No live traces. Switch to All synced or start a crew.'
              : 'No traces yet. Run an MCPLab crew or OACP demo.'}
        </p>
      ) : null}
      {showList ? (
        <ul
          ref={listRef}
          className={styles.list}
          role="listbox"
          aria-label="Trace list"
          aria-activedescendant={
            selectedTraceId !== undefined ? `trace-row-${selectedTraceId}` : undefined
          }
        >
          {visibleTraces.map((trace) => (
            <TraceRailRow
              key={trace.traceId}
              trace={trace}
              isSelected={trace.traceId === selectedTraceId}
              onSelect={(traceId) => {
                onSelectTrace?.(traceId);
              }}
            />
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
