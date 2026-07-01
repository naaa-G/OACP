import { useMemo, useRef, useState } from 'react';

import type {
  AgentObservabilityRecord,
  ObservabilityErrorDetails,
  TraceTimelineEvent,
} from '@oacp/observability-client';
import { Panel, SearchInput, Stat, Toggle } from '@oacp/ui';

import { AgentCatalogToolbar } from '../components/AgentCatalogToolbar.js';
import { AgentDensityToggle } from '../components/AgentDensityToggle.js';
import { RoleLegend } from '../components/RoleLegend.js';
import { VirtualizedAgentCatalog } from '../components/VirtualizedAgentCatalog.js';
import { useAgentCatalogDensity } from '../hooks/useAgentCatalogDensity.js';
import { useAgentCatalogFilters } from '../hooks/useAgentCatalogFilters.js';
import { useAgentTraceScope } from '../hooks/useAgentTraceScope.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useFleetCollapse } from '../hooks/useFleetCollapse.js';
import { usePinnedAgents } from '../hooks/usePinnedAgents.js';
import { useSearchFocusShortcut } from '../hooks/useSearchFocusShortcut.js';
import { formatAgentScopeLabel } from '../utils/agent-trace-filter.js';
import { buildAgentCatalogView } from '../utils/agent-catalog-pipeline.js';
import { SEARCH_DEBOUNCE_MS } from '../utils/agent-search.js';
import { collectRoleLegendEntries } from '../utils/role-taxonomy.js';
import styles from './AgentsPanel.module.css';

export interface AgentsPanelProps {
  readonly agents?: readonly AgentObservabilityRecord[] | undefined;
  readonly activeAgentIds?: ReadonlySet<string> | undefined;
  readonly agentCount?: number | undefined;
  readonly traceCount?: number | undefined;
  readonly messageCount?: number | undefined;
  readonly isLoading?: boolean | undefined;
  readonly isReconnecting?: boolean | undefined;
  readonly isError?: boolean | undefined;
  readonly errorDetails?: ObservabilityErrorDetails | undefined;
  readonly hasActiveTrace?: boolean | undefined;
  readonly traceTimeline?: readonly TraceTimelineEvent[] | undefined;
  readonly selectedAgentId?: string | undefined;
  readonly onSelectAgent?: ((agentId: string) => void) | undefined;
  readonly onLinkAgent?: ((agentId: string) => void) | undefined;
}

function formatStat(value: number | undefined, isLoading: boolean): string | number {
  if (isLoading && value === undefined) {
    return '—';
  }
  return value ?? 0;
}

function AgentListSkeleton() {
  return (
    <div className={styles.fleetGroups} aria-hidden="true">
      {Array.from({ length: 2 }, (_, sectionIndex) => (
        <div key={sectionIndex} className={styles.skeletonSection}>
          <div className={styles.skeletonHeader} />
          <ul className={styles.list}>
            {Array.from({ length: 2 }, (__, cardIndex) => (
              <li key={cardIndex} className={styles.skeletonCard}>
                <div className={styles.skeletonLineWide} />
                <div className={styles.skeletonLineFull} />
                <div className={styles.skeletonCaps}>
                  <span className={styles.skeletonCap} />
                  <span className={styles.skeletonCap} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AgentsPanel({
  agents = [],
  activeAgentIds = new Set<string>(),
  agentCount,
  traceCount,
  messageCount,
  isLoading = false,
  isReconnecting = false,
  isError = false,
  errorDetails,
  hasActiveTrace = false,
  traceTimeline = [],
  selectedAgentId,
  onSelectAgent,
  onLinkAgent,
}: AgentsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useSearchFocusShortcut(searchInputRef);

  const {
    traceScope,
    traceSelected,
    showAllRegisteredAgents,
    setShowAllRegisteredAgents,
    scopedAgents,
  } = useAgentTraceScope({
    agents,
    activeAgentIds,
    hasActiveTrace,
  });

  const { isFleetCollapsed, toggleFleetCollapsed } = useFleetCollapse();
  const { density, setDensity } = useAgentCatalogDensity();
  const { pinnedAgentIds, isPinned, canPin, togglePin } = usePinnedAgents();
  const {
    filters: catalogFilters,
    toggleStatus,
    toggleFleet,
    toggleInTraceOnly,
    setSort,
    clearFilters,
  } = useAgentCatalogFilters();

  const catalogView = useMemo(
    () =>
      buildAgentCatalogView({
        agents,
        scopedAgents,
        activeAgentIds,
        catalogFilters,
        searchQuery: debouncedSearchQuery,
        pinnedAgentIds,
        traceTimeline,
      }),
    [
      activeAgentIds,
      agents,
      catalogFilters,
      debouncedSearchQuery,
      pinnedAgentIds,
      scopedAgents,
      traceTimeline,
    ],
  );

  const {
    filteredAgents,
    pinnedAgents,
    fleetGroups,
    searchHighlightsByAgentId,
    activeSearch,
    activeFilters,
  } = catalogView;

  const visibleAfterSearch = filteredAgents.length;
  const scopeLabel = formatAgentScopeLabel(
    traceScope.isTraceScoped ? traceScope.traceAgentCount : traceScope.registeredCount,
    traceScope.registeredCount,
  );

  const roleLegendEntries = useMemo(
    () => collectRoleLegendEntries(filteredAgents),
    [filteredAgents],
  );

  const mcplabCount = useMemo(
    () => agents.filter((agent) => agent.fleet === 'mcplab').length,
    [agents],
  );

  const showEmptyRegistry = !isLoading && !isError && agents.length === 0;
  const showEmptyTraceScope =
    !isLoading && !isError && traceScope.isTraceScoped && traceScope.scopedAgents.length === 0;
  const showNoMatches =
    !isLoading &&
    !isError &&
    scopedAgents.length > 0 &&
    (activeSearch || activeFilters) &&
    filteredAgents.length === 0;
  const showList = !isLoading && !isError && (fleetGroups.length > 0 || pinnedAgents.length > 0);

  const footer = hasActiveTrace ? (
    <div className={styles.legend} aria-label="Agent status legend">
      <span className={styles.legendIdle}>Idle agent</span>
      <span className={styles.legendActive}>Active in trace</span>
      <span className={styles.legendSelected}>Selected (click to toggle)</span>
      {showAllRegisteredAgents ? (
        <span className={styles.legendDimmed}>Out of trace (dimmed)</span>
      ) : null}
      <span className={styles.legendFleetHint}>
        Fleet color = left card ring · Press / to search
      </span>
      {mcplabCount > 0 ? (
        <span className={styles.legendFleet}>MCPLab fleet: {mcplabCount}</span>
      ) : null}
      {traceScope.traceAgentCount > 0 ? (
        <span className={styles.legendCount}>
          {traceScope.traceAgentCount} in trace · {traceScope.registeredCount} registered
        </span>
      ) : null}
      <RoleLegend entries={roleLegendEntries} />
    </div>
  ) : undefined;

  return (
    <Panel
      id="agentsPanel"
      title="Registered agents"
      bodyClassName={styles.body}
      footer={footer}
      aria-label="Registered agents"
      aria-busy={isLoading}
    >
      <div className="oacp-stats-grid">
        <Stat label="Agents" value={formatStat(agentCount, isLoading)} />
        <Stat label="Traces" value={formatStat(traceCount, isLoading)} />
        <Stat label="Messages" value={formatStat(messageCount, isLoading)} />
      </div>

      {traceSelected ? (
        <div className={styles.scopeBar}>
          <p className={styles.scopeCount} data-testid="agents-scope-count">
            {scopeLabel}
            {traceScope.isTraceScoped ? (
              <span className={styles.scopeHint}> · In current trace</span>
            ) : null}
          </p>
          <Toggle
            label="Show all registered"
            checked={showAllRegisteredAgents}
            onChange={(event) => {
              setShowAllRegisteredAgents(event.target.checked);
            }}
            data-testid="agents-show-all-toggle"
          />
        </div>
      ) : null}

      <AgentCatalogToolbar
        agents={scopedAgents}
        filters={catalogFilters}
        onToggleStatus={toggleStatus}
        onToggleFleet={toggleFleet}
        onToggleInTraceOnly={toggleInTraceOnly}
        onSortChange={setSort}
        onClearFilters={clearFilters}
        traceSelected={traceSelected}
      />

      <AgentDensityToggle density={density} onChange={setDensity} />

      <div className={styles.searchWrap}>
        <SearchInput
          ref={searchInputRef}
          data-testid="agents-search-input"
          placeholder="Search agents, fleet, role… (press /)"
          aria-label="Search agents"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
          }}
          onClear={() => {
            setSearchQuery('');
            searchInputRef.current?.focus();
          }}
        />
      </div>

      {isLoading && !isReconnecting ? (
        <>
          <p className={styles.statusMessage} role="status">
            Loading snapshot from OACP server…
          </p>
          <AgentListSkeleton />
        </>
      ) : null}

      {isReconnecting ? (
        <p className={styles.statusMessage} role="status" data-testid="agents-reconnecting">
          Reconnecting to OACP server…
        </p>
      ) : null}

      {isError && !isReconnecting ? (
        <p className={styles.errorMessage} role="status">
          {errorDetails?.hint ??
            'Failed to load agents. Use Retry in the banner or check the OACP server.'}
        </p>
      ) : null}

      {showEmptyRegistry ? <p className="oacp-empty">No agents registered</p> : null}

      {showEmptyTraceScope ? (
        <p className="oacp-empty" data-testid="agents-trace-empty">
          No agents participated in this trace yet.
        </p>
      ) : null}

      {showNoMatches ? (
        <p className="oacp-empty" data-testid="agents-search-empty" role="status">
          {activeSearch && activeFilters ? (
            <>
              No agents match the selected filters and “{debouncedSearchQuery.trim()}”. Try clearing
              filters, a shorter query, or enable <strong>Show all registered</strong>.
            </>
          ) : activeSearch ? (
            <>
              No agents match “{debouncedSearchQuery.trim()}”. Try a shorter query, another fleet,
              or enable <strong>Show all registered</strong>.
            </>
          ) : (
            <>
              No agents match the selected filters. Try clearing filters or enable{' '}
              <strong>Show all registered</strong>.
            </>
          )}
        </p>
      ) : null}

      {showList ? (
        <div className={styles.listArea}>
          <VirtualizedAgentCatalog
            fleetGroups={fleetGroups}
            pinnedAgents={pinnedAgents}
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
            onToggleFleet={toggleFleetCollapsed}
            onSelectAgent={onSelectAgent}
            onLinkAgent={onLinkAgent}
            onTogglePin={togglePin}
            scrollRef={listRef}
          />
        </div>
      ) : null}

      {showList && traceScope.isTraceScoped && visibleAfterSearch < traceScope.registeredCount ? (
        <p className={styles.scopeFooter} data-testid="agents-scope-footer">
          Showing {visibleAfterSearch} of {traceScope.traceAgentCount} trace agents
          {activeSearch || activeFilters ? ' matching filters' : ''}. Enable{' '}
          <strong>Show all registered</strong> to browse the full registry (
          {traceScope.registeredCount}).
        </p>
      ) : null}
    </Panel>
  );
}
