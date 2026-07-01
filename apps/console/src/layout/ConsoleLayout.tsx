import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatObservabilityError, shortAgentId } from '@oacp/observability-client';

import { AgentDetailDrawer } from '../components/AgentDetailDrawer.js';
import { ConsoleDebugPanel } from '../components/ConsoleDebugPanel.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { useConnectionStatus } from '../hooks/useConnectionStatus.js';
import { useConsoleDebugBootstrap } from '../hooks/useConsoleDebugBootstrap.js';
import { useConsoleSnapshot } from '../hooks/useConsoleSnapshot.js';
import { useObservabilitySseBridge } from '../hooks/useObservabilitySseBridge.js';
import { useReconcileInterval } from '../hooks/useReconcileInterval.js';
import { usePresentationModeEscape } from '../hooks/usePresentationModeEscape.js';
import { usePresentationTraceCycle } from '../hooks/usePresentationTraceCycle.js';
import { useShowcaseGraphResize } from '../hooks/useShowcaseGraphResize.js';
import { useTraceReplay } from '../hooks/useTraceReplay.js';
import { useTraceRailScope } from '../hooks/useTraceRailScope.js';
import { AgentsPanel } from '../panels/AgentsPanel.js';
import { GraphPanel } from '../panels/GraphPanel.js';
import { MessageFlowPanel } from '../panels/MessageFlowPanel.js';
import { TraceRail } from '../panels/TraceRail.js';
import { useSelectionStore } from '../store/selection-store.js';
import { ConsoleHeader } from './ConsoleHeader.js';
import styles from './ConsoleLayout.module.css';
import { consoleDebug } from '../utils/console-debug.js';

export function ConsoleLayout() {
  useConsoleDebugBootstrap();

  const [liveEnabled, setLiveEnabled] = useState(true);
  const { reconcileIntervalMs, setReconcileIntervalMs } = useReconcileInterval();
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [manualRefreshPending, setManualRefreshPending] = useState(false);
  const presentationMode = useSelectionStore((state) => state.presentationMode);
  const presentationTraceCycle = useSelectionStore((state) => state.presentationTraceCycle);
  const presentationTraceCycleMs = useSelectionStore((state) => state.presentationTraceCycleMs);
  const setPresentationMode = useSelectionStore((state) => state.setPresentationMode);
  const { scope: traceRailScope, setScope: setTraceRailScope } = useTraceRailScope();

  const {
    data,
    error,
    isFetching,
    isLoading,
    isReconnecting,
    refetch,
    isError,
    selectedTraceId,
    selectedAgentId,
    detailAgentId,
    selectTrace,
    handleAgentCardClick,
    linkAgentSelection,
    closeAgentDetail,
    clearAgentSelection,
    selectAgent,
    activeAgentIds,
    stats,
    traces,
  } = useConsoleSnapshot({
    liveEnabled,
    reconcileIntervalMs,
  });

  useObservabilitySseBridge({
    traceId: selectedTraceId,
    enabled: liveEnabled,
  });

  const connectionStatus = useConnectionStatus({
    isError,
    isFetching,
    isLoading,
    hasSnapshot: data !== undefined,
  });

  const errorDetails = useMemo(
    () => (isError ? formatObservabilityError(error) : undefined),
    [error, isError],
  );

  const handleRefresh = useCallback(() => {
    setErrorDismissed(false);
    setManualRefreshPending(true);
    void refetch().finally(() => {
      setManualRefreshPending(false);
    });
  }, [refetch]);

  useEffect(() => {
    consoleDebug('ui.headerRefresh', {
      manualRefreshPending,
      isReconnecting,
      isFetching,
      isLoading,
      showsRefreshingButton: isReconnecting || manualRefreshPending,
      connectionStatus,
    });
  }, [connectionStatus, isFetching, isLoading, isReconnecting, manualRefreshPending]);

  const showError = isError && errorDetails !== undefined && !errorDismissed;

  const detailAgent = useMemo(
    () =>
      data === undefined ? undefined : data.agents.find((agent) => agent.id === detailAgentId),
    [data, detailAgentId],
  );

  const selectedAgentLabel = useMemo(() => {
    if (selectedAgentId === undefined || data === undefined) {
      return undefined;
    }

    const agent = data.agents.find((row) => row.id === selectedAgentId);
    if (agent !== undefined && agent.name.trim().length > 0) {
      return agent.name;
    }

    return shortAgentId(selectedAgentId);
  }, [data, selectedAgentId]);

  const traceReplay = useTraceReplay({
    timeline: data?.active_trace?.timeline,
    selectedTraceId,
  });

  usePresentationModeEscape({
    enabled: presentationMode,
    onExit: () => {
      setPresentationMode(false);
    },
  });

  usePresentationTraceCycle({
    enabled: presentationMode && presentationTraceCycle,
    traces,
    selectedTraceId,
    onSelectTrace: selectTrace,
    intervalMs: presentationTraceCycleMs,
  });

  useShowcaseGraphResize(presentationMode);

  return (
    <div
      className={presentationMode ? `${styles.root} ${styles.presentationRoot}` : styles.root}
      data-testid={presentationMode ? 'console-presentation-mode' : 'console-layout'}
      data-presentation-cycle={presentationTraceCycle ? 'enabled' : 'disabled'}
    >
      {presentationMode ? null : (
        <ConsoleHeader
          liveEnabled={liveEnabled}
          reconcileIntervalMs={reconcileIntervalMs}
          onLiveChange={setLiveEnabled}
          onReconcileIntervalChange={setReconcileIntervalMs}
          onRefresh={handleRefresh}
          isRefreshing={isReconnecting || manualRefreshPending}
          connectionStatus={connectionStatus}
          selectedAgentId={selectedAgentId}
          selectedAgentLabel={selectedAgentLabel}
          onClearSelection={clearAgentSelection}
        />
      )}

      {showError && !presentationMode ? (
        <ErrorBanner
          details={errorDetails}
          onRetry={handleRefresh}
          onDismiss={() => {
            setErrorDismissed(true);
          }}
        />
      ) : null}

      <main className={presentationMode ? styles.presentationMain : styles.main}>
        {presentationMode ? null : (
          <div className={styles.agentsColumn}>
            <AgentsPanel
              agents={data?.agents}
              activeAgentIds={activeAgentIds}
              selectedAgentId={selectedAgentId}
              onSelectAgent={handleAgentCardClick}
              onLinkAgent={linkAgentSelection}
              agentCount={stats?.agentCount}
              traceCount={stats?.traceCount}
              messageCount={stats?.messageCount}
              isLoading={isLoading}
              isReconnecting={isReconnecting}
              isError={isError}
              errorDetails={errorDetails}
              hasActiveTrace={data?.active_trace !== undefined}
              traceTimeline={data?.active_trace?.timeline}
            />
          </div>
        )}
        <div className={presentationMode ? styles.presentationGraphColumn : styles.graphColumn}>
          <GraphPanel
            selectedTraceId={selectedTraceId}
            selectedAgentId={selectedAgentId}
            onFocusAgent={selectAgent}
            onClearFocus={clearAgentSelection}
            isLoading={isLoading}
            isReconnecting={isReconnecting}
            isOffline={isError}
            liveEnabled={liveEnabled}
            agents={data?.agents}
            agentLinks={data?.agent_links}
            activeAgentIds={activeAgentIds}
            timeline={data?.active_trace?.timeline}
            replayMessageIndex={traceReplay.messageIndex}
            replayMaxMessageIndex={traceReplay.maxMessageIndex}
            replayIsLive={traceReplay.isLive}
            replayIsPlaying={traceReplay.isPlaying}
            replaySupported={traceReplay.replaySupported}
            replayPlaybackSpeed={traceReplay.playbackSpeed}
            onReplayMessageIndexChange={traceReplay.setMessageIndex}
            onReplayTogglePlayPause={traceReplay.togglePlayPause}
            onReplayGoLive={traceReplay.goLive}
            onReplayPlaybackSpeedChange={traceReplay.setPlaybackSpeed}
            presentationMode={presentationMode}
          />
        </div>
        {presentationMode ? null : (
          <>
            <div className={styles.feedColumn}>
              <MessageFlowPanel
                timeline={traceReplay.displayTimeline}
                selectedTraceId={selectedTraceId}
                selectedAgentId={selectedAgentId}
                selectedAgentLabel={selectedAgentLabel}
                isLoading={isLoading}
                isReconnecting={isReconnecting}
                isOffline={isError}
                liveEnabled={liveEnabled && traceReplay.isLive}
                replayMessageIndex={traceReplay.isReplayMode ? traceReplay.messageIndex : undefined}
              />
            </div>
            <div className={styles.traceColumn}>
              <TraceRail
                traces={traces}
                selectedTraceId={selectedTraceId}
                traceCount={data?.trace_count}
                isLoading={isLoading}
                isReconnecting={isReconnecting}
                isOffline={isError}
                scope={traceRailScope}
                onScopeChange={setTraceRailScope}
                onSelectTrace={selectTrace}
              />
            </div>
          </>
        )}
      </main>

      {presentationMode ? null : (
        <AgentDetailDrawer
          agent={detailAgent}
          isOpen={detailAgentId !== undefined && detailAgent !== undefined}
          traces={traces}
          traceTimeline={data?.active_trace?.timeline}
          selectedTraceId={selectedTraceId}
          onClose={closeAgentDetail}
          onSelectTrace={selectTrace}
        />
      )}

      <ConsoleDebugPanel />
    </div>
  );
}
