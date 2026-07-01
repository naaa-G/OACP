import { useCallback, useState } from 'react';

import type { TraceTimelineEvent } from '@oacp/observability-client';
import {
  formatTimelineRoute,
  timelineFeedStatus,
  timelineMessageTone,
} from '@oacp/observability-client';

import {
  formatTimelineEventLatency,
  timelineEventDetailJson,
  timelineEventLatencyMs,
} from '../utils/message-feed-detail.js';

import styles from './MessageFlowItem.module.css';

export interface MessageFlowItemProps {
  readonly event: TraceTimelineEvent;
  readonly previousEvent?: TraceTimelineEvent | undefined;
  readonly traceId?: string | undefined;
  readonly isNew?: boolean;
  readonly isScrubActive?: boolean;
  readonly expanded?: boolean | undefined;
  readonly onToggleExpanded?: (() => void) | undefined;
}

function statusClass(status: ReturnType<typeof timelineFeedStatus>): string | undefined {
  switch (status) {
    case 'success':
      return styles.success;
    case 'error':
      return styles.error;
    default:
      return undefined;
  }
}

function toneClass(tone: ReturnType<typeof timelineMessageTone>): string | undefined {
  switch (tone) {
    case 'request':
      return styles.toneRequest;
    case 'delegation':
      return styles.toneDelegation;
    case 'response-success':
      return styles.toneResponseSuccess;
    case 'response-error':
      return styles.toneResponseError;
    default:
      return styles.toneNeutral;
  }
}

export function MessageFlowItem({
  event,
  previousEvent,
  traceId,
  isNew = false,
  isScrubActive = false,
  expanded = false,
  onToggleExpanded,
}: MessageFlowItemProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = onToggleExpanded !== undefined ? expanded : internalExpanded;
  const latencyMs = timelineEventLatencyMs(event, previousEvent);
  const status = timelineFeedStatus(event);
  const tone = timelineMessageTone(event);

  const toggleExpanded = useCallback(() => {
    if (onToggleExpanded !== undefined) {
      onToggleExpanded();
      return;
    }
    setInternalExpanded((current) => !current);
  }, [onToggleExpanded]);

  const className = [
    styles.item,
    statusClass(status),
    toneClass(tone),
    isNew ? styles.newItem : undefined,
    isScrubActive ? styles.scrubActive : undefined,
    isExpanded ? styles.expanded : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li
      className={className}
      data-message-id={event.message_id}
      data-message-index={event.index}
      data-message-type={event.type}
      data-message-tone={tone}
      data-scrub-active={isScrubActive ? 'true' : 'false'}
      data-expanded={isExpanded ? 'true' : 'false'}
    >
      <div className={styles.header}>
        <div className={styles.summaryBlock}>
          <div className={styles.summary}>{event.summary}</div>
          <div className={styles.meta}>{formatTimelineRoute(event)}</div>
        </div>
        <button
          type="button"
          className={styles.expandButton}
          data-testid={`feed-expand-${event.message_id}`}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse message details' : 'Expand message details'}
          onClick={toggleExpanded}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded ? (
        <div className={styles.details} data-testid={`feed-details-${event.message_id}`}>
          <dl className={styles.detailGrid}>
            <div>
              <dt>Latency</dt>
              <dd>{formatTimelineEventLatency(latencyMs)}</dd>
            </div>
            <div>
              <dt>Message ID</dt>
              <dd>{event.message_id}</dd>
            </div>
            <div>
              <dt>Timeline index</dt>
              <dd>{event.index}</dd>
            </div>
            <div>
              <dt>Message tone</dt>
              <dd>{tone}</dd>
            </div>
            {traceId !== undefined ? (
              <div>
                <dt>Trace ID</dt>
                <dd>{traceId}</dd>
              </div>
            ) : null}
          </dl>
          <pre className={styles.jsonBlock}>
            {timelineEventDetailJson(event, traceId, previousEvent)}
          </pre>
        </div>
      ) : null}
    </li>
  );
}
