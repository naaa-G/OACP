import type { TraceListEntry } from '@oacp/observability-client';
import {
  formatTraceActivityTime,
  formatTraceDuration,
  formatTraceListMeta,
  formatTraceStatusLabel,
  resolveTraceDisplayStatus,
  shortTraceId,
} from '@oacp/observability-client';

import styles from './TraceRailRow.module.css';

export interface TraceRailRowProps {
  readonly trace: TraceListEntry;
  readonly isSelected: boolean;
  readonly onSelect: (traceId: string) => void;
}

function statusClass(status: ReturnType<typeof resolveTraceDisplayStatus>): string | undefined {
  switch (status) {
    case 'running':
      return styles.statusRunning;
    case 'completed':
      return styles.statusCompleted;
    case 'failed':
      return styles.statusFailed;
  }
}

export function TraceRailRow({ trace, isSelected, onSelect }: TraceRailRowProps) {
  const meta = formatTraceListMeta(trace);
  const activity = formatTraceActivityTime(trace.lastActivityAt);
  const duration = formatTraceDuration(trace);
  const status = resolveTraceDisplayStatus(trace);
  const statusLabel = formatTraceStatusLabel(status);
  const label = shortTraceId(trace.traceId);

  return (
    <li>
      <button
        type="button"
        className={isSelected ? `${styles.row} ${styles.selected}` : styles.row}
        onClick={() => {
          onSelect(trace.traceId);
        }}
        aria-current={isSelected ? 'true' : undefined}
        id={isSelected ? `trace-row-${trace.traceId}` : undefined}
        aria-label={`Trace ${trace.traceId}, ${statusLabel}, duration ${duration}, ${meta}, last activity ${activity}`}
        title={trace.traceId}
        data-trace-status={status}
      >
        <span className={styles.id}>{label}</span>
        <span className={styles.meta}>{meta}</span>
        <span className={styles.badges} aria-label="Trace status and duration">
          <span className={`${styles.statusBadge} ${statusClass(status)}`}>{statusLabel}</span>
          <span className={styles.durationBadge}>{duration}</span>
        </span>
        <time className={styles.time} dateTime={trace.lastActivityAt}>
          {activity}
        </time>
      </button>
    </li>
  );
}
