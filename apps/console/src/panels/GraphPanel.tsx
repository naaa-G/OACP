import { shortTraceId, useTraceGraph } from '@oacp/observability-client';
import type {
  AgentLink,
  AgentObservabilityRecord,
  TraceTimelineEvent,
} from '@oacp/observability-client';
import { Panel, Toggle } from '@oacp/ui';
import { useEffect, useMemo, useRef, useState } from 'react';

import { OpsGraphLegend } from '../components/OpsGraphLegend.js';
import { TraceReplayScrubber } from '../components/TraceReplayScrubber.js';
import { GraphExportButton } from '../components/GraphExportButton.js';
import { useGraphModeSelectionSync } from '../hooks/useGraphModeSelectionSync.js';
import { useAgentTraceScope } from '../hooks/useAgentTraceScope.js';
import { useGraphMode } from '../hooks/useGraphMode.js';
import { CONSOLE_TRACE_GRAPH_STALE_TIME_MS } from '../config/console-observability-policy.js';
import { LegacyRingGraph } from '../graph/LegacyRingGraph.js';
import { GraphModeToggle } from '../graph/GraphModeToggle.js';
import { OpsGraph } from '../graph/OpsGraph.js';
import { ShowcaseGraph } from '../graph/ShowcaseGraph.js';
import { ShowcaseLayoutToggle } from '../graph/ShowcaseLayoutToggle.js';
import { ShowcasePresentationSettings } from '../graph/ShowcasePresentationSettings.js';
import { ShowcasePresentationToggle } from '../graph/ShowcasePresentationToggle.js';
import { mergeRegistryGhostsIntoGraph } from '../graph/ops-graph-registry.js';
import { opsGraphInteractionApi } from '../graph/ops-graph-interaction-api.js';
import { OpsGraphViewportControls } from '../graph/OpsGraphViewportControls.js';
import { useSelectionStore } from '../store/selection-store.js';
import { consoleDebug } from '../utils/console-debug.js';
import { buildTraceGraphFromSnapshot } from '../utils/trace-graph-from-snapshot.js';
import { sliceTraceGraphForReplay } from '../utils/trace-replay.js';
import type { TraceReplaySpeed } from '../utils/trace-replay.js';
import styles from './GraphPanel.module.css';

export type GraphPanelState = 'empty' | 'loading' | 'ready';

export interface GraphPanelProps {
  readonly selectedTraceId?: string | undefined;
  readonly selectedAgentId?: string | undefined;
  readonly onFocusAgent?: ((agentId: string) => void) | undefined;
  readonly onClearFocus?: (() => void) | undefined;
  readonly isLoading?: boolean | undefined;
  readonly isReconnecting?: boolean | undefined;
  readonly liveEnabled?: boolean | undefined;
  readonly agents?: readonly AgentObservabilityRecord[] | undefined;
  readonly agentLinks?: readonly AgentLink[] | undefined;
  readonly activeAgentIds?: ReadonlySet<string> | undefined;
  readonly isOffline?: boolean | undefined;
  readonly timeline?: readonly TraceTimelineEvent[] | undefined;
  readonly replayMessageIndex?: number | undefined;
  readonly replayMaxMessageIndex?: number | undefined;
  readonly replayIsLive?: boolean | undefined;
  readonly replayIsPlaying?: boolean | undefined;
  readonly replaySupported?: boolean | undefined;
  readonly replayPlaybackSpeed?: TraceReplaySpeed | undefined;
  readonly onReplayMessageIndexChange?: ((index: number) => void) | undefined;
  readonly onReplayTogglePlayPause?: (() => void) | undefined;
  readonly onReplayGoLive?: (() => void) | undefined;
  readonly onReplayPlaybackSpeedChange?: ((speed: TraceReplaySpeed) => void) | undefined;
  readonly presentationMode?: boolean | undefined;
}

function resolveGraphState({
  selectedTraceId,
  isLoading,
  isReconnecting = false,
  isOffline = false,
  agents = [],
  mode,
  traceGraphLoading = false,
  hasTraceGraph = false,
  hasTraceGraphFromApi = false,
}: GraphPanelProps & {
  readonly mode: ReturnType<typeof useGraphMode>;
  readonly traceGraphLoading?: boolean | undefined;
  readonly hasTraceGraph?: boolean | undefined;
  readonly hasTraceGraphFromApi?: boolean | undefined;
}): GraphPanelState {
  if (selectedTraceId === undefined) {
    if (mode === 'showcase' && agents.length > 0 && !isOffline) {
      return 'ready';
    }
    return 'empty';
  }

  if (isOffline) {
    return 'empty';
  }

  const hasAgents = agents.length > 0;

  if (isReconnecting && !(mode === 'showcase' && hasAgents) && !(mode === 'ops' && hasTraceGraph)) {
    return 'empty';
  }

  if (mode === 'showcase') {
    if (traceGraphLoading && !hasTraceGraphFromApi) {
      return 'loading';
    }
    if (isLoading && !hasTraceGraphFromApi && !hasAgents) {
      return 'loading';
    }
    return 'ready';
  }

  if (mode === 'ops') {
    if (traceGraphLoading && !hasTraceGraph && !hasAgents) {
      return 'loading';
    }
    if (!hasTraceGraph) {
      return 'empty';
    }
    return 'ready';
  }

  if (isLoading && !isReconnecting) {
    return 'loading';
  }

  return 'ready';
}

function explainGraphPanelState(input: {
  readonly state: GraphPanelState;
  readonly mode: ReturnType<typeof useGraphMode>;
  readonly selectedTraceId: string | undefined;
  readonly isLoading: boolean;
  readonly isReconnecting: boolean;
  readonly isOffline: boolean;
  readonly agents: readonly unknown[];
  readonly traceGraphLoading: boolean;
  readonly hasTraceGraph: boolean;
  readonly hasTraceGraphFromApi: boolean;
}): string {
  const hasAgents = input.agents.length > 0;

  if (input.state === 'empty') {
    if (input.isOffline) {
      return 'offline';
    }
    if (
      input.isReconnecting &&
      !(input.mode === 'showcase' && hasAgents) &&
      !(input.mode === 'ops' && input.hasTraceGraph)
    ) {
      return 'reconnecting-clears-panel';
    }
    if (input.mode === 'ops' && !input.hasTraceGraph) {
      return 'ops-missing-trace-graph';
    }
    return 'no-trace-selected';
  }

  if (input.state === 'loading') {
    if (input.mode === 'showcase' && input.isLoading && !input.hasTraceGraphFromApi && !hasAgents) {
      return 'showcase-waiting-snapshot';
    }
    if (input.mode === 'showcase' && input.traceGraphLoading && !input.hasTraceGraphFromApi) {
      return 'showcase-waiting-trace-graph-api';
    }
    if (input.mode === 'ops' && input.traceGraphLoading && !input.hasTraceGraph && !hasAgents) {
      return 'ops-waiting-trace-graph-api';
    }
    if (input.isLoading) {
      return 'snapshot-initial-load';
    }
    return 'unknown-loading';
  }

  return 'ready';
}

function GraphLoadingSvg() {
  return (
    <svg
      className={styles.canvas}
      viewBox="0 0 400 280"
      role="img"
      aria-label="Loading delegation graph"
    >
      <circle
        className={styles.loadingRing}
        cx="200"
        cy="130"
        r="72"
        fill="none"
        stroke="var(--oacp-border)"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
      <circle cx="200" cy="58" r="14" className={styles.loadingNode} />
      <circle cx="272" cy="130" r="14" className={styles.loadingNode} />
      <circle cx="200" cy="202" r="14" className={styles.loadingNode} />
      <circle cx="128" cy="130" r="14" className={styles.loadingNode} />
    </svg>
  );
}

export function GraphPanel({
  selectedTraceId,
  selectedAgentId,
  onFocusAgent,
  onClearFocus,
  isLoading = false,
  isReconnecting = false,
  isOffline = false,
  liveEnabled = true,
  agents = [],
  agentLinks = [],
  activeAgentIds = new Set<string>(),
  timeline,
  replayMessageIndex = 0,
  replayMaxMessageIndex = 0,
  replayIsLive = true,
  replayIsPlaying = false,
  replaySupported = false,
  replayPlaybackSpeed = 1,
  onReplayMessageIndexChange,
  onReplayTogglePlayPause,
  onReplayGoLive,
  onReplayPlaybackSpeedChange,
  presentationMode = false,
}: GraphPanelProps) {
  const mode = useGraphMode();
  const [showcaseMounted, setShowcaseMounted] = useState(mode === 'showcase');
  const [opsMounted, setOpsMounted] = useState(mode === 'ops');
  const setGraphMode = useSelectionStore((state) => state.setGraphMode);
  const showcaseLayout = useSelectionStore((state) => state.showcaseLayout);
  const setShowcaseLayout = useSelectionStore((state) => state.setShowcaseLayout);
  const showcaseBloom = useSelectionStore((state) => state.showcaseBloom);
  const setShowcaseBloom = useSelectionStore((state) => state.setShowcaseBloom);
  const showcaseFleetFilter = useSelectionStore((state) => state.showcaseFleetFilter);
  const setShowcaseFleetFilter = useSelectionStore((state) => state.setShowcaseFleetFilter);
  const presentationTraceCycle = useSelectionStore((state) => state.presentationTraceCycle);
  const setPresentationMode = useSelectionStore((state) => state.setPresentationMode);
  const setPresentationTraceCycle = useSelectionStore((state) => state.setPresentationTraceCycle);
  const traceGraphQuery = useTraceGraph({
    traceId: selectedTraceId,
    pollIntervalMs: false,
    staleTime: CONSOLE_TRACE_GRAPH_STALE_TIME_MS,
    enabled: mode === 'showcase' && selectedTraceId !== undefined && !isOffline,
  });

  const { scopedAgents, scopedAgentLinks, showAllRegisteredAgents, setShowAllRegisteredAgents } =
    useAgentTraceScope({
      agents,
      activeAgentIds,
      hasActiveTrace: selectedTraceId !== undefined && !isOffline,
      agentLinks,
    });

  const traceGraphFromSnapshot = useMemo(() => {
    if (selectedTraceId === undefined) {
      return undefined;
    }

    const linksForGraph =
      mode === 'ops'
        ? scopedAgentLinks.length > 0
          ? scopedAgentLinks
          : agentLinks
        : scopedAgentLinks;
    const agentsForGraph =
      mode === 'ops' ? (scopedAgents.length > 0 ? scopedAgents : agents) : scopedAgents;

    if (linksForGraph.length === 0) {
      return undefined;
    }

    return buildTraceGraphFromSnapshot({
      traceId: selectedTraceId,
      agents: agentsForGraph,
      agentLinks: linksForGraph,
      participantIds: activeAgentIds,
    });
  }, [activeAgentIds, agentLinks, agents, mode, scopedAgentLinks, scopedAgents, selectedTraceId]);

  const traceGraphFromApi = traceGraphQuery.data;
  const hasTraceGraphFromApi =
    traceGraphFromApi !== undefined && traceGraphFromApi.nodes.length > 0;
  const traceGraph = useMemo(() => {
    // Ops 2D renders from snapshot links/depths; avoid swapping to API graph on background refetch.
    if (mode === 'ops') {
      if (traceGraphFromSnapshot !== undefined && traceGraphFromSnapshot.nodes.length > 0) {
        return traceGraphFromSnapshot;
      }

      return traceGraphFromApi !== undefined && traceGraphFromApi.nodes.length > 0
        ? traceGraphFromApi
        : traceGraphFromSnapshot;
    }

    return traceGraphFromApi !== undefined && traceGraphFromApi.nodes.length > 0
      ? traceGraphFromApi
      : traceGraphFromSnapshot;
  }, [mode, traceGraphFromApi, traceGraphFromSnapshot]);
  const hasTraceGraph = traceGraph !== undefined && traceGraph.nodes.length > 0;

  const traceGraphSource = useMemo((): 'api' | 'snapshot' => {
    if (
      mode === 'ops' &&
      traceGraphFromSnapshot !== undefined &&
      traceGraphFromSnapshot.nodes.length > 0
    ) {
      return 'snapshot';
    }

    return traceGraphFromApi !== undefined && traceGraphFromApi.nodes.length > 0
      ? 'api'
      : 'snapshot';
  }, [mode, traceGraphFromApi, traceGraphFromSnapshot]);

  const displayTraceGraph = useMemo(() => {
    if (traceGraph === undefined || timeline === undefined || timeline.length === 0) {
      return traceGraph;
    }
    if (replayIsLive) {
      return traceGraph;
    }
    return sliceTraceGraphForReplay(traceGraph, timeline, replayMessageIndex);
  }, [traceGraph, timeline, replayIsLive, replayMessageIndex]);

  const registryGraphView = useMemo(() => {
    if (
      displayTraceGraph === undefined ||
      !showAllRegisteredAgents ||
      !replayIsLive ||
      agents.length === 0
    ) {
      return {
        graph: displayTraceGraph,
        ghostAgentIds: new Set<string>(),
        ghostCount: 0,
      };
    }

    return mergeRegistryGhostsIntoGraph(displayTraceGraph, agents);
  }, [agents, displayTraceGraph, replayIsLive, showAllRegisteredAgents]);

  const opsGraphData = registryGraphView.graph;
  const ghostAgentIds = registryGraphView.ghostAgentIds;
  const ghostCount = registryGraphView.ghostCount;

  const traceGraphLoading =
    mode === 'ops'
      ? isLoading && !hasTraceGraph && agentLinks.length === 0
      : traceGraphQuery.isLoading ||
        (traceGraphQuery.isFetching && !traceGraphQuery.isError && !hasTraceGraphFromApi);

  const state = resolveGraphState({
    selectedTraceId,
    isLoading,
    isReconnecting,
    isOffline,
    agents,
    mode,
    traceGraphLoading,
    hasTraceGraph,
    hasTraceGraphFromApi,
  });

  const showcaseVisible = mode === 'showcase' && state === 'ready';
  const opsVisible = mode === 'ops' && state === 'ready' && opsGraphData !== undefined;

  const panelStateReason = explainGraphPanelState({
    state,
    mode,
    selectedTraceId,
    isLoading,
    isReconnecting,
    isOffline,
    agents,
    traceGraphLoading,
    hasTraceGraph,
    hasTraceGraphFromApi,
  });

  const prevPanelSignatureRef = useRef('');
  useEffect(() => {
    const signature = [
      mode,
      state,
      panelStateReason,
      showcaseVisible ? 'showcase-on' : 'showcase-off',
      opsVisible ? 'ops-on' : 'ops-off',
      selectedTraceId ?? '',
      hasTraceGraph ? 'graph-yes' : 'graph-no',
      traceGraphSource,
    ].join('|');

    if (signature === prevPanelSignatureRef.current) {
      return;
    }

    const previous = prevPanelSignatureRef.current;
    prevPanelSignatureRef.current = signature;

    const userVisibleJank =
      previous.includes('ready') &&
      (state === 'loading' || state === 'empty') &&
      panelStateReason !== 'reconnecting-clears-panel';

    consoleDebug(userVisibleJank ? 'graph.panelJank' : 'graph.panelState', {
      mode,
      state,
      reason: panelStateReason,
      showcaseVisible,
      opsVisible,
      selectedTraceId: selectedTraceId ?? null,
      hasTraceGraph,
      traceGraphLoading,
      isLoading,
      isReconnecting,
      isOffline,
      agentCount: agents.length,
      traceGraphSource,
      traceGraphFetchStatus: traceGraphQuery.fetchStatus,
      snapshotIsLoading: isLoading,
    });
  }, [
    agents.length,
    hasTraceGraph,
    isLoading,
    isOffline,
    isReconnecting,
    mode,
    opsVisible,
    panelStateReason,
    selectedTraceId,
    showcaseVisible,
    state,
    traceGraphFromApi,
    traceGraphLoading,
    traceGraphQuery.fetchStatus,
    traceGraphSource,
  ]);

  useGraphModeSelectionSync(mode, selectedAgentId);

  useEffect(() => {
    if (mode === 'showcase') {
      setShowcaseMounted(true);
    }
    if (mode === 'ops') {
      setOpsMounted(true);
    }
  }, [mode]);

  useEffect(() => {
    if (hasTraceGraph) {
      setOpsMounted(true);
    }
  }, [hasTraceGraph]);

  useEffect(() => {
    consoleDebug('graph.mode', {
      mode,
      selectedTraceId: selectedTraceId ?? null,
    });
  }, [mode, selectedTraceId]);

  useEffect(() => {
    if (!hasTraceGraph) {
      return;
    }

    consoleDebug('graph.traceGraphReady', {
      traceId: selectedTraceId ?? null,
      source: traceGraphSource,
      nodeCount: traceGraph.nodes.length,
    });
  }, [hasTraceGraph, selectedTraceId, traceGraph, traceGraphSource]);

  const keepShowcaseWarm = showcaseMounted && state === 'ready';
  const keepOpsWarm = opsMounted && state === 'ready' && opsGraphData !== undefined;

  const footer = (
    <>
      {mode === 'ops' && state === 'ready' && selectedTraceId !== undefined ? (
        <div className={styles.registryBar} data-testid="ops-graph-registry-bar">
          <Toggle
            label="Show full registry"
            checked={showAllRegisteredAgents}
            onChange={(event) => {
              setShowAllRegisteredAgents(event.target.checked);
            }}
            data-testid="ops-graph-show-all-toggle"
          />
          {showAllRegisteredAgents && ghostCount > 0 ? (
            <span className={styles.ghostBadge} data-testid="ops-graph-ghost-badge">
              +{ghostCount} idle agent{ghostCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      ) : null}
      <OpsGraphLegend
        mode={mode}
        edges={
          opsGraphData?.edges ??
          agentLinks.map((link) => ({
            from_agent: link.from_agent,
            to_agent: link.to_agent,
            kind: link.kind,
            message_count: link.message_count,
          }))
        }
        showGhostLegend={showAllRegisteredAgents && ghostCount > 0}
        selectedAgentId={selectedAgentId}
      />
    </>
  );

  const showOpsViewportControls = !presentationMode && mode === 'ops' && state === 'ready';
  const showShowcaseLayoutToggle =
    !presentationMode && mode === 'showcase' && state === 'ready' && selectedTraceId !== undefined;
  const showShowcasePresentationSettings =
    !presentationMode && mode === 'showcase' && state === 'ready' && selectedTraceId !== undefined;
  const showPresentationToggle = showShowcasePresentationSettings;
  const showGraphExportButton =
    !presentationMode &&
    state === 'ready' &&
    (mode === 'ops' || mode === 'showcase') &&
    selectedTraceId !== undefined;
  const showGraphModeToggle =
    !presentationMode &&
    (state === 'ready' || state === 'empty') &&
    (mode === 'ops' || mode === 'showcase');
  const showReplayScrubber =
    !presentationMode &&
    mode === 'ops' &&
    state === 'ready' &&
    replaySupported &&
    onReplayMessageIndexChange !== undefined &&
    onReplayTogglePlayPause !== undefined &&
    onReplayGoLive !== undefined &&
    onReplayPlaybackSpeedChange !== undefined;

  return (
    <Panel
      id="graphPanel"
      title="Delegation graph"
      className={presentationMode ? styles.presentationPanel : styles.standardPanel}
      bodyClassName={presentationMode ? `${styles.body} ${styles.presentationBody}` : styles.body}
      aria-label="Delegation graph"
      aria-busy={state === 'loading'}
      headerActions={
        showGraphModeToggle ||
        showShowcaseLayoutToggle ||
        showShowcasePresentationSettings ||
        showPresentationToggle ||
        showGraphExportButton ||
        showOpsViewportControls ? (
          <div className={styles.headerActions}>
            {showGraphModeToggle ? (
              <GraphModeToggle
                mode={mode === 'showcase' ? 'showcase' : 'ops'}
                onModeChange={setGraphMode}
              />
            ) : null}
            {showGraphExportButton ? (
              <GraphExportButton mode={mode} traceId={selectedTraceId} />
            ) : null}
            {showShowcaseLayoutToggle ? (
              <ShowcaseLayoutToggle
                layoutKind={showcaseLayout}
                onLayoutKindChange={setShowcaseLayout}
              />
            ) : null}
            {showShowcasePresentationSettings ? (
              <ShowcasePresentationSettings
                bloomIntensity={showcaseBloom}
                effectiveBloomIntensity={showcaseBloom}
                gpuProfileLabel="GPU"
                onBloomIntensityChange={setShowcaseBloom}
              />
            ) : null}
            {showPresentationToggle ? (
              <ShowcasePresentationToggle
                traceCycleEnabled={presentationTraceCycle}
                onTraceCycleChange={setPresentationTraceCycle}
                onEnterPresentation={() => {
                  setPresentationMode(true);
                }}
              />
            ) : null}
            {showOpsViewportControls ? (
              <OpsGraphViewportControls
                onFitView={() => {
                  opsGraphInteractionApi.fitView?.();
                }}
                onResetView={() => {
                  opsGraphInteractionApi.resetView?.();
                }}
              />
            ) : null}
          </div>
        ) : undefined
      }
      footer={presentationMode ? undefined : footer}
    >
      {state === 'empty' ? (
        <div className={styles.empty} data-testid="graph-empty-state">
          {isReconnecting ? (
            <>
              <strong>Reconnecting to OACP server…</strong> The delegation graph will reload when
              the snapshot is available again.
            </>
          ) : isOffline ? (
            <>
              <strong>Snapshot unavailable.</strong> Start the OACP server and click Retry in the
              banner to load the delegation graph.
            </>
          ) : mode === 'ops' && traceGraphQuery.isError ? (
            <>
              <strong>Trace graph unavailable.</strong> Ensure the OACP server exposes{' '}
              <code>/v1/observability/traces/:id/graph</code>.
            </>
          ) : mode === 'showcase' && traceGraphQuery.isError ? (
            <>
              <strong>Trace graph unavailable.</strong> Ensure the OACP server exposes{' '}
              <code>/v1/observability/traces/:id/graph</code>.
            </>
          ) : (
            <>Select a trace or run an MCPLab demo to visualize agent collaboration.</>
          )}
        </div>
      ) : null}

      {state === 'loading' ? (
        <div className={styles.canvasWrap}>
          <GraphLoadingSvg />
          <p className={styles.overlayMessage} role="status">
            Loading delegation graph
            {selectedTraceId !== undefined ? ` for ${shortTraceId(selectedTraceId)}` : ''}…
          </p>
        </div>
      ) : null}

      {state === 'ready' && mode === 'legacy' ? (
        <div className={styles.canvasWrap}>
          <LegacyRingGraph
            key={`${showAllRegisteredAgents ? 'all' : 'trace'}-${scopedAgents.length}`}
            agents={scopedAgents}
            agentLinks={scopedAgentLinks}
            activeAgentIds={activeAgentIds}
            selectedAgentId={selectedAgentId}
          />
        </div>
      ) : null}

      {keepOpsWarm ? (
        <div
          className={opsVisible ? styles.canvasWrap : styles.hiddenCanvasLayer}
          aria-hidden={!opsVisible}
        >
          <OpsGraph
            key={`${opsGraphData.trace_id}-${replayIsLive ? 'live' : replayMessageIndex}-${showAllRegisteredAgents ? 'all' : 'trace'}`}
            graph={opsGraphData}
            active={opsVisible}
            activeAgentIds={activeAgentIds}
            selectedAgentId={selectedAgentId}
            onFocusAgent={onFocusAgent}
            onClearFocus={onClearFocus}
            replayActive={!replayIsLive}
            ghostAgentIds={ghostAgentIds}
          />
        </div>
      ) : null}

      {keepShowcaseWarm ? (
        <div
          className={
            showcaseVisible
              ? presentationMode
                ? `${styles.canvasWrap} ${styles.presentationCanvasWrap}`
                : styles.canvasWrap
              : styles.hiddenCanvasLayer
          }
          aria-hidden={!showcaseVisible}
        >
          <ShowcaseGraph
            key={`showcase-${selectedTraceId ?? 'registry'}-${showcaseLayout}-${presentationMode ? 'presentation' : 'standard'}`}
            active={showcaseVisible}
            graph={traceGraph}
            agents={scopedAgents}
            activeAgentIds={activeAgentIds}
            selectedAgentId={selectedAgentId}
            layoutKind={showcaseLayout}
            timeline={timeline}
            liveEnabled={liveEnabled}
            bloomIntensity={showcaseBloom}
            fleetFilter={showcaseFleetFilter}
            onFleetFilterChange={presentationMode ? undefined : setShowcaseFleetFilter}
            presentationMode={presentationMode}
            presentationTraceCycle={presentationTraceCycle}
            onSelectAgent={presentationMode ? undefined : onFocusAgent}
            onClearFocus={presentationMode ? undefined : onClearFocus}
          />
        </div>
      ) : null}

      {showReplayScrubber ? (
        <TraceReplayScrubber
          messageIndex={replayMessageIndex}
          maxMessageIndex={replayMaxMessageIndex}
          isLive={replayIsLive}
          isPlaying={replayIsPlaying}
          playbackSpeed={replayPlaybackSpeed}
          onMessageIndexChange={onReplayMessageIndexChange}
          onTogglePlayPause={onReplayTogglePlayPause}
          onGoLive={onReplayGoLive}
          onPlaybackSpeedChange={onReplayPlaybackSpeedChange}
        />
      ) : null}
    </Panel>
  );
}
