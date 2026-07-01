import type { AgentObservabilityRecord } from '@oacp/observability-client';
import { shortAgentId } from '@oacp/observability-client';

import type { AgentSearchHighlights } from '../utils/agent-search.js';
import { resolveFleetBucket, type CatalogFleetId } from '../utils/fleet-catalog.js';
import { resolveAgentRole } from '../utils/role-taxonomy.js';
import { AgentRowActions } from './AgentRowActions.js';
import { RoleBadge } from './RoleBadge.js';
import { SearchHighlight } from './SearchHighlight.js';
import styles from './AgentCard.module.css';

const MAX_VISIBLE_CAPABILITIES = 8;

function fleetClassName(fleet: string): string {
  switch (fleet) {
    case 'mcplab':
      return styles.fleetMcplab ?? '';
    case 'startup-demo':
      return styles.fleetStartup ?? '';
    case 'system':
      return styles.fleetSystem ?? '';
    case 'external':
      return styles.fleetExternal ?? '';
    default:
      return styles.fleetExternal ?? '';
  }
}

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

function cardClassName(
  isActiveInTrace: boolean,
  isSelected: boolean,
  isDimmed: boolean,
  fleetId: CatalogFleetId,
): string {
  const classes = [styles.card, fleetRingClass(fleetId)];
  if (isActiveInTrace) {
    classes.push(styles.active);
  }
  if (isSelected) {
    classes.push(styles.selected);
  }
  if (isDimmed) {
    classes.push(styles.dimmed);
  }
  return classes.join(' ');
}

export interface AgentCardProps {
  readonly agent: AgentObservabilityRecord;
  readonly density?: 'compact' | 'detailed';
  readonly virtualized?: boolean;
  readonly isActiveInTrace?: boolean;
  readonly isSelected?: boolean;
  readonly isDimmed?: boolean | undefined;
  readonly isPinned?: boolean | undefined;
  readonly canPin?: boolean | undefined;
  readonly searchHighlights?: AgentSearchHighlights | undefined;
  readonly onSelect?: ((agentId: string) => void) | undefined;
  readonly onLinkAgent?: ((agentId: string) => void) | undefined;
  readonly onTogglePin?: ((agentId: string) => void) | undefined;
}

export function AgentCard({
  agent,
  density = 'detailed',
  virtualized = false,
  isActiveInTrace = false,
  isSelected = false,
  isDimmed = false,
  isPinned = false,
  canPin = true,
  searchHighlights,
  onSelect,
  onLinkAgent,
  onTogglePin,
}: AgentCardProps) {
  const displayName = agent.name.trim().length > 0 ? agent.name : shortAgentId(agent.id);
  const shortId = shortAgentId(agent.id);
  const capabilities = agent.capabilities;
  const visibleCaps = capabilities.slice(0, MAX_VISIBLE_CAPABILITIES);
  const hiddenCount = capabilities.length - visibleCaps.length;
  const showActiveBadge = isActiveInTrace || agent.status === 'active';
  const showErrorBadge = agent.status === 'error';
  const fleetBucket = resolveFleetBucket(agent.fleet);
  const resolvedRole = resolveAgentRole(agent);
  const Wrapper = virtualized ? 'div' : 'li';
  const wrapperProps = virtualized ? { role: 'listitem' as const } : {};

  const buttonLabel =
    density === 'compact'
      ? `${resolvedRole?.label ?? shortId}${isSelected ? ', selected' : ''}`
      : `${displayName}${resolvedRole !== undefined && resolvedRole.label.toLowerCase() !== displayName.toLowerCase() ? `, ${resolvedRole.label}` : ''}${isSelected ? ', selected' : ''}`;

  return (
    <Wrapper
      {...wrapperProps}
      className={`${cardClassName(isActiveInTrace, isSelected, isDimmed, fleetBucket)} ${density === 'compact' ? styles.compact : ''} ${virtualized ? (density === 'compact' ? styles.virtualizedCompact : styles.virtualizedDetailed) : ''} ${isPinned ? styles.pinned : ''}`}
      data-fleet-bucket={fleetBucket}
      data-role-id={resolvedRole?.id}
      data-density={density}
      data-pinned={isPinned ? 'true' : 'false'}
    >
      <div className={styles.cardShell}>
        <button
          type="button"
          className={styles.selectButton}
          data-agent-id={agent.id}
          data-active={showActiveBadge ? 'true' : 'false'}
          data-selected={isSelected ? 'true' : 'false'}
          data-out-of-trace={isDimmed ? 'true' : 'false'}
          data-status={agent.status ?? 'idle'}
          aria-pressed={isSelected}
          aria-label={buttonLabel}
          onClick={() => {
            onSelect?.(agent.id);
          }}
        >
          {density === 'compact' ? (
            <div className={styles.compactRow}>
              {isPinned ? (
                <span className={styles.pinnedBadge} aria-label="Pinned agent">
                  Pin
                </span>
              ) : null}
              {resolvedRole !== undefined ? (
                <RoleBadge role={resolvedRole} fleetId={fleetBucket} compact />
              ) : null}
              <span className={styles.compactId} title={agent.id}>
                <SearchHighlight
                  text={shortId}
                  ranges={searchHighlights?.id ?? searchHighlights?.name ?? []}
                />
              </span>
              {showErrorBadge ? <span className={styles.compactBadgeError}>Error</span> : null}
              {showActiveBadge && !showErrorBadge ? (
                <span className={styles.compactBadgeActive}>Active</span>
              ) : null}
            </div>
          ) : (
            <>
              <div className={styles.nameRow}>
                <span className={styles.name}>
                  <SearchHighlight text={displayName} ranges={searchHighlights?.name ?? []} />
                </span>
                {isPinned ? (
                  <span className={styles.pinnedBadge} aria-label="Pinned agent">
                    Pin
                  </span>
                ) : null}
                {showErrorBadge ? (
                  <span className={styles.errorBadge} aria-label="Agent reported an error in trace">
                    Error
                  </span>
                ) : null}
                {showActiveBadge && !showErrorBadge ? (
                  <span className={styles.activeBadge} aria-label="Active in selected trace">
                    Active
                  </span>
                ) : null}
              </div>

              <div className={styles.taxonomyRow} aria-label="Fleet and role">
                {resolvedRole !== undefined ? (
                  <RoleBadge role={resolvedRole} fleetId={fleetBucket} compact />
                ) : null}
                {agent.fleet !== undefined ? (
                  <span className={`${styles.fleetBadge} ${fleetClassName(agent.fleet)}`}>
                    {agent.fleet}
                  </span>
                ) : null}
              </div>

              <div className={styles.id} title={agent.id}>
                <SearchHighlight text={agent.id} ranges={searchHighlights?.id ?? []} />
              </div>
              {visibleCaps.length > 0 ? (
                <ul className={styles.caps} aria-label="Capabilities">
                  {visibleCaps.map((cap) => (
                    <li key={cap} className={styles.cap}>
                      <SearchHighlight
                        text={cap}
                        ranges={searchHighlights?.capabilities[cap] ?? []}
                      />
                    </li>
                  ))}
                  {hiddenCount > 0 ? (
                    <li className={styles.capMore} aria-label={`${hiddenCount} more capabilities`}>
                      +{hiddenCount} more
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className={styles.noCaps}>No capabilities registered</p>
              )}
            </>
          )}
        </button>
        {virtualized ? (
          <AgentRowActions
            agentId={agent.id}
            isPinned={isPinned}
            canPin={canPin}
            onFilterFeed={() => {
              onLinkAgent?.(agent.id);
            }}
            onFocusInGraph={() => {
              onLinkAgent?.(agent.id);
            }}
            onTogglePin={() => {
              onTogglePin?.(agent.id);
            }}
          />
        ) : null}
      </div>
    </Wrapper>
  );
}
