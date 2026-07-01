import { useEffect, useMemo, useRef, type RefObject } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';

import type { AgentObservabilityRecord } from '@oacp/observability-client';

import type { AgentSearchHighlights } from '../utils/agent-search.js';
import type { AgentCatalogDensity } from '../hooks/useAgentCatalogDensity.js';
import {
  buildVirtualAgentRows,
  estimateVirtualRowSize,
  findVirtualAgentRowIndex,
  VIRTUAL_ROW_GAP_PX,
  type VirtualAgentRow,
} from '../utils/virtual-agent-rows.js';
import type { CatalogFleetId, FleetAgentGroup } from '../utils/fleet-catalog.js';
import { AgentCard } from './AgentCard.js';
import { FleetSectionHeader } from './FleetSectionHeader.js';
import { PinnedSectionHeader } from './PinnedSectionHeader.js';
import styles from './VirtualizedAgentCatalog.module.css';

export interface VirtualizedAgentCatalogProps {
  readonly fleetGroups: readonly FleetAgentGroup[];
  readonly pinnedAgents?: readonly AgentObservabilityRecord[] | undefined;
  readonly density: AgentCatalogDensity;
  readonly activeAgentIds: ReadonlySet<string>;
  readonly selectedAgentId?: string | undefined;
  readonly showAllRegisteredAgents: boolean;
  readonly traceSelected: boolean;
  readonly activeSearch: boolean;
  readonly searchHighlightsByAgentId: ReadonlyMap<string, AgentSearchHighlights>;
  readonly isFleetCollapsed: (fleetId: CatalogFleetId) => boolean;
  readonly isPinned: (agentId: string) => boolean;
  readonly canPin: (agentId: string) => boolean;
  readonly onToggleFleet: (fleetId: CatalogFleetId) => void;
  readonly onSelectAgent?: ((agentId: string) => void) | undefined;
  readonly onLinkAgent?: ((agentId: string) => void) | undefined;
  readonly onTogglePin?: ((agentId: string) => void) | undefined;
  readonly scrollRef?: RefObject<HTMLDivElement | null>;
}

export function VirtualizedAgentCatalog({
  fleetGroups,
  pinnedAgents = [],
  density,
  activeAgentIds,
  selectedAgentId,
  showAllRegisteredAgents,
  traceSelected,
  activeSearch,
  searchHighlightsByAgentId,
  isFleetCollapsed,
  isPinned,
  canPin,
  onToggleFleet,
  onSelectAgent,
  onLinkAgent,
  onTogglePin,
  scrollRef: externalScrollRef,
}: VirtualizedAgentCatalogProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;

  const rows = useMemo(
    () => buildVirtualAgentRows(fleetGroups, isFleetCollapsed, pinnedAgents),
    [fleetGroups, isFleetCollapsed, pinnedAgents],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    getItemKey: (index) => rows[index]?.key ?? index,
    estimateSize: (index) => {
      const row = rows[index];
      if (row === undefined) {
        return VIRTUAL_ROW_GAP_PX;
      }

      return estimateVirtualRowSize(row, density) + VIRTUAL_ROW_GAP_PX;
    },
    overscan: 12,
  });

  useEffect(() => {
    if (selectedAgentId === undefined) {
      return;
    }

    const rowIndex = findVirtualAgentRowIndex(rows, selectedAgentId);
    if (rowIndex < 0) {
      return;
    }

    virtualizer.scrollToIndex(rowIndex, { align: 'auto' });
  }, [rows, selectedAgentId, virtualizer]);

  return (
    <div
      ref={scrollRef}
      className={styles.scroller}
      role="list"
      aria-label="Agent list grouped by fleet"
      data-testid="agents-virtual-list"
      data-density={density}
    >
      <div
        className={styles.inner}
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        data-virtual-row-count={rows.length}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (row === undefined) {
            return null;
          }

          return (
            <div
              key={row.key}
              data-index={virtualRow.index}
              className={styles.row}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <VirtualAgentRowView
                row={row}
                density={density}
                activeAgentIds={activeAgentIds}
                selectedAgentId={selectedAgentId}
                showAllRegisteredAgents={showAllRegisteredAgents}
                traceSelected={traceSelected}
                activeSearch={activeSearch}
                searchHighlightsByAgentId={searchHighlightsByAgentId}
                isFleetCollapsed={isFleetCollapsed}
                isPinned={isPinned}
                canPin={canPin}
                onToggleFleet={onToggleFleet}
                onSelectAgent={onSelectAgent}
                onLinkAgent={onLinkAgent}
                onTogglePin={onTogglePin}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VirtualAgentRowView({
  row,
  density,
  activeAgentIds,
  selectedAgentId,
  showAllRegisteredAgents,
  traceSelected,
  activeSearch,
  searchHighlightsByAgentId,
  isFleetCollapsed,
  isPinned,
  canPin,
  onToggleFleet,
  onSelectAgent,
  onLinkAgent,
  onTogglePin,
}: {
  readonly row: VirtualAgentRow;
  readonly density: AgentCatalogDensity;
  readonly activeAgentIds: ReadonlySet<string>;
  readonly selectedAgentId?: string | undefined;
  readonly showAllRegisteredAgents: boolean;
  readonly traceSelected: boolean;
  readonly activeSearch: boolean;
  readonly searchHighlightsByAgentId: ReadonlyMap<string, AgentSearchHighlights>;
  readonly isFleetCollapsed: (fleetId: CatalogFleetId) => boolean;
  readonly isPinned: (agentId: string) => boolean;
  readonly canPin: (agentId: string) => boolean;
  readonly onToggleFleet: (fleetId: CatalogFleetId) => void;
  readonly onSelectAgent?: ((agentId: string) => void) | undefined;
  readonly onLinkAgent?: ((agentId: string) => void) | undefined;
  readonly onTogglePin?: ((agentId: string) => void) | undefined;
}) {
  if (row.type === 'pinned-header') {
    return <PinnedSectionHeader agentCount={row.agentCount} />;
  }

  if (row.type === 'fleet-header') {
    return (
      <FleetSectionHeader
        fleetId={row.fleetId}
        agentCount={row.agentCount}
        collapsed={isFleetCollapsed(row.fleetId)}
        onToggle={() => {
          onToggleFleet(row.fleetId);
        }}
      />
    );
  }

  const inTrace = activeAgentIds.has(row.agent.id);
  const isDimmed = traceSelected && !inTrace && (row.pinned === true || showAllRegisteredAgents);
  const pinned = row.pinned === true || isPinned(row.agent.id);

  return (
    <AgentCard
      agent={row.agent}
      density={density}
      virtualized
      isActiveInTrace={inTrace}
      isSelected={row.agent.id === selectedAgentId}
      isDimmed={isDimmed}
      isPinned={pinned}
      canPin={canPin(row.agent.id)}
      searchHighlights={activeSearch ? searchHighlightsByAgentId.get(row.agent.id) : undefined}
      onSelect={onSelectAgent}
      onLinkAgent={onLinkAgent}
      onTogglePin={onTogglePin}
    />
  );
}
