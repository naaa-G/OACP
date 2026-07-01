import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  AgentObservabilityRecord,
  TraceListEntry,
  TraceTimelineEvent,
} from '@oacp/observability-client';
import {
  formatTimelineRoute,
  formatTraceListMeta,
  shortAgentId,
  shortTraceId,
} from '@oacp/observability-client';
import { Button } from '@oacp/ui';

import { useDrawerDismiss } from '../hooks/useDrawerDismiss.js';
import { copyTextToClipboard } from '../utils/clipboard.js';
import { resolveFleetBucket } from '../utils/fleet-catalog.js';
import {
  collectAgentMessages,
  collectAgentRecentTraces,
  formatPublicKeyFingerprint,
  resolveMcplabAgentConfigUrl,
} from '../utils/agent-detail.js';
import { resolveAgentRole } from '../utils/role-taxonomy.js';
import { RoleBadge } from './RoleBadge.js';
import styles from './AgentDetailDrawer.module.css';

export interface AgentDetailDrawerProps {
  readonly agent: AgentObservabilityRecord | undefined;
  readonly isOpen: boolean;
  readonly traces?: readonly TraceListEntry[] | undefined;
  readonly traceTimeline?: readonly TraceTimelineEvent[] | undefined;
  readonly selectedTraceId?: string | undefined;
  readonly onClose: () => void;
  readonly onSelectTrace?: ((traceId: string) => void) | undefined;
}

function formatLastSeen(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    return '—';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString();
}

export function AgentDetailDrawer({
  agent,
  isOpen,
  traces,
  traceTimeline,
  selectedTraceId,
  onClose,
  onSelectTrace,
}: AgentDetailDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useDrawerDismiss(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) {
      setCopyState('idle');
      return;
    }

    drawerRef.current?.focus();
  }, [isOpen, agent?.id]);

  const fleetBucket = useMemo(
    () => (agent !== undefined ? resolveFleetBucket(agent.fleet) : undefined),
    [agent],
  );
  const resolvedRole = useMemo(
    () => (agent !== undefined ? resolveAgentRole(agent) : undefined),
    [agent],
  );
  const recentTraces = useMemo(
    () => (agent !== undefined ? collectAgentRecentTraces(agent.id, traces) : []),
    [agent, traces],
  );
  const recentMessages = useMemo(
    () => (agent !== undefined ? collectAgentMessages(agent.id, traceTimeline) : []),
    [agent, traceTimeline],
  );
  const mcplabConfigUrl = useMemo(
    () => (agent !== undefined ? resolveMcplabAgentConfigUrl(agent) : undefined),
    [agent],
  );
  const fingerprint = useMemo(
    () => (agent !== undefined ? formatPublicKeyFingerprint(agent.publicKey) : '—'),
    [agent],
  );

  const handleCopyUri = useCallback(async () => {
    if (agent === undefined) {
      return;
    }

    const copied = await copyTextToClipboard(agent.id);
    setCopyState(copied ? 'copied' : 'failed');
    window.setTimeout(() => {
      setCopyState('idle');
    }, 2000);
  }, [agent]);

  if (!isOpen || agent === undefined) {
    return null;
  }

  const displayName = agent.name.trim().length > 0 ? agent.name : shortAgentId(agent.id);

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close agent detail"
        data-testid="agent-detail-backdrop"
        onClick={onClose}
      />

      <aside
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-detail-title"
        data-testid="agent-detail-drawer"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h2 id="agent-detail-title" className={styles.title}>
              {displayName}
            </h2>
            <p className={styles.subtitle}>{agent.id}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close agent detail"
            data-testid="agent-detail-close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section} aria-labelledby="agent-detail-identity">
            <h3 id="agent-detail-identity" className={styles.sectionTitle}>
              Identity
            </h3>
            <dl className={styles.fieldList}>
              <div className={styles.field}>
                <dt className={styles.fieldLabel}>URI</dt>
                <dd className={styles.fieldValue}>
                  <div className={styles.uriRow}>
                    <code className={`${styles.uriValue} ${styles.mono}`}>{agent.id}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      data-testid="agent-detail-copy-uri"
                      onClick={() => {
                        void handleCopyUri();
                      }}
                    >
                      Copy URI
                    </Button>
                  </div>
                  {copyState === 'copied' ? (
                    <span className={styles.copyFeedback} role="status">
                      Copied to clipboard
                    </span>
                  ) : null}
                  {copyState === 'failed' ? (
                    <span className={styles.copyFeedback} role="status">
                      Copy failed — select URI manually
                    </span>
                  ) : null}
                </dd>
              </div>

              <div className={styles.field}>
                <dt className={styles.fieldLabel}>Version</dt>
                <dd className={styles.fieldValue}>{agent.version}</dd>
              </div>

              {agent.description !== undefined && agent.description.trim().length > 0 ? (
                <div className={styles.field}>
                  <dt className={styles.fieldLabel}>Description</dt>
                  <dd className={styles.fieldValue}>{agent.description}</dd>
                </div>
              ) : null}

              <div className={styles.field}>
                <dt className={styles.fieldLabel}>Fleet / role</dt>
                <dd className={styles.fieldValue}>
                  {resolvedRole !== undefined && fleetBucket !== undefined ? (
                    <RoleBadge role={resolvedRole} fleetId={fleetBucket} />
                  ) : null}
                  {agent.fleet !== undefined ? ` · ${agent.fleet}` : null}
                </dd>
              </div>

              <div className={styles.field}>
                <dt className={styles.fieldLabel}>Status</dt>
                <dd className={styles.fieldValue}>{agent.status ?? 'idle'}</dd>
              </div>

              <div className={styles.field}>
                <dt className={styles.fieldLabel}>Last seen</dt>
                <dd className={styles.fieldValue}>{formatLastSeen(agent.last_seen_at)}</dd>
              </div>

              <div className={styles.field}>
                <dt className={styles.fieldLabel}>Public key fingerprint</dt>
                <dd
                  className={`${styles.fieldValue} ${styles.mono}`}
                  data-testid="agent-detail-fingerprint"
                >
                  {fingerprint}
                </dd>
              </div>
            </dl>

            {mcplabConfigUrl !== undefined ? (
              <div className={styles.actions}>
                <a
                  href={mcplabConfigUrl}
                  className={styles.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="agent-detail-mcplab-config"
                >
                  Open MCPLab config ↗
                </a>
              </div>
            ) : null}
          </section>

          <section className={styles.section} aria-labelledby="agent-detail-capabilities">
            <h3 id="agent-detail-capabilities" className={styles.sectionTitle}>
              Capabilities
            </h3>
            {agent.capabilities.length > 0 ? (
              <ul className={styles.capList} aria-label="Capabilities">
                {agent.capabilities.map((capability) => (
                  <li
                    key={capability}
                    className={styles.cap}
                    data-testid={`agent-detail-capability-${capability}`}
                  >
                    {capability}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No capabilities registered</p>
            )}
          </section>

          <section className={styles.section} aria-labelledby="agent-detail-traces">
            <h3 id="agent-detail-traces" className={styles.sectionTitle}>
              Recent traces
            </h3>
            {recentTraces.length > 0 ? (
              <ul className={styles.traceList}>
                {recentTraces.map((trace) => (
                  <li key={trace.traceId}>
                    <button
                      type="button"
                      className={styles.traceButton}
                      data-testid={`agent-detail-trace-${trace.traceId}`}
                      aria-current={trace.traceId === selectedTraceId ? 'true' : undefined}
                      onClick={() => {
                        onSelectTrace?.(trace.traceId);
                      }}
                    >
                      <span className={styles.traceId}>{shortTraceId(trace.traceId)}</span>
                      <span className={styles.traceMeta}>{formatTraceListMeta(trace)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No traces include this agent yet</p>
            )}
          </section>

          <section className={styles.section} aria-labelledby="agent-detail-messages">
            <h3 id="agent-detail-messages" className={styles.sectionTitle}>
              Messages in current trace
            </h3>
            {recentMessages.length > 0 ? (
              <ul className={styles.messageList}>
                {recentMessages.map((message) => (
                  <li
                    key={message.event.message_id}
                    className={styles.messageItem}
                    data-testid={`agent-detail-message-${message.event.message_id}`}
                  >
                    <span className={styles.messageDirection}>
                      {message.direction === 'out' ? 'Out' : 'In'}
                    </span>
                    <p className={styles.messageSummary}>{message.event.summary}</p>
                    <p className={styles.messageMeta}>{formatTimelineRoute(message.event)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No messages for this agent in the selected trace</p>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
