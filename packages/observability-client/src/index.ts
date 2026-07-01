export {
  buildObservabilityAuthHeaders,
  createObservabilityFetch,
  fetchObservabilityRuntimeConfig,
  OACP_API_KEY_HEADER,
  OACP_API_KEY_SSE_QUERY_PARAM,
  type ObservabilityRuntimeAuthConfig,
  type ObservabilityRuntimeConfigResponse,
} from './auth.js';

export {
  fetchSnapshot,
  fetchTraceGraph,
  OBSERVABILITY_SNAPSHOT_PATH,
  OBSERVABILITY_TRACE_GRAPH_PATH,
  LEGACY_PLAYGROUND_SNAPSHOT_PATH,
  type FetchSnapshotOptions,
  type FetchTraceGraphOptions,
} from './client.js';

export {
  OBSERVABILITY_EVENTS_PATH,
  OBSERVABILITY_EVENT_TYPES,
  isObservabilityEventType,
  parseObservabilityEventPayload,
  type ObservabilityEvent,
  type ObservabilityEventType,
  type MessageAppendedEvent,
  type MessageAppendedEventData,
  type AgentRegisteredEvent,
  type AgentRegisteredEventData,
  type TraceStartedEvent,
  type TraceStartedEventData,
  type TraceCompletedEvent,
  type TraceCompletedEventData,
  type StreamResyncEvent,
  type StreamHeartbeatEvent,
} from './events.js';

export {
  connectObservabilityEventStream,
  buildObservabilityEventsUrl,
  type ConnectObservabilityEventStreamOptions,
  type ObservabilityEventStreamHandle,
} from './event-stream.js';

export { ObservabilityClientError } from './errors.js';

export {
  formatObservabilityError,
  resolveConnectionStatus,
  type ConnectionStatus,
  type ObservabilityErrorDetails,
  type ResolveConnectionStatusInput,
} from './error-messages.js';

export {
  ObservabilityProvider,
  useObservabilityConfig,
  type ObservabilityClientConfig,
  type ObservabilityProviderProps,
} from './provider.js';

export {
  useSnapshot,
  useTraces,
  useTraceGraph,
  SNAPSHOT_QUERY_KEY,
  TRACE_GRAPH_QUERY_KEY,
  type UseSnapshotOptions,
  type UseSnapshotResult,
  type UseTracesResult,
  type UseTraceGraphOptions,
  type UseTraceGraphResult,
  useObservabilityEvents,
  type UseObservabilityEventsOptions,
} from './hooks/index.js';

export { activeAgentsFromTrace, shortAgentId } from './active-agents.js';

export {
  TRACE_ID_QUERY_PARAM,
  AGENT_QUERY_PARAM,
  GRAPH_MODE_QUERY_PARAM,
  DEFAULT_CONSOLE_GRAPH_MODE,
  buildConsoleTraceUrl,
  buildConsoleHomeUrl,
  buildTraceDeepLink,
  readAgentIdFromSearch,
  readGraphModeFromSearch,
  readTraceIdFromSearch,
  syncSelectionToSearch,
  writeTraceIdToSearch,
} from './trace-url.js';

export {
  formatTraceActivityTime,
  formatTraceDuration,
  formatTraceListMeta,
  formatTraceStatusLabel,
  resolveTraceDisplayStatus,
  shortTraceId,
  traceDurationMs,
  type TraceDisplayStatus,
} from './trace-format.js';

export {
  FEED_TAIL_LIMIT,
  FEED_VIRTUAL_TAIL_LIMIT,
  TIMELINE_MESSAGE_TONE_STYLES,
  formatTimelineRoute,
  tailTimelineEvents,
  timelineFeedStatus,
  timelineMessageTone,
  timelineMessageToneStyle,
  type TimelineFeedStatus,
  type TimelineMessageTone,
  type TimelineMessageToneStyle,
} from './timeline-feed.js';

export {
  SNAPSHOT_RECONCILE_INTERVAL_MS,
  SNAPSHOT_RECONCILE_INTERVAL_OPTIONS,
  SSE_DEBOUNCED_RESYNC_MS,
  SSE_CATCHUP_AGENT_THRESHOLD,
  SSE_CATCHUP_AGENT_WINDOW_MS,
  SSE_LIVE_MESSAGE_MAX_AGE_MS,
  SSE_REPLAY_IDLE_MS,
  SSE_REPLAY_MAX_MS,
  isRecentObservabilityTimestamp,
  isSnapshotReconcileIntervalMs,
  type SnapshotReconcileIntervalMs,
} from './reconcile.js';

export {
  mergeTimelineEventsAppendOnly,
  timelineEventFromMessageAppended,
  diffNewTimelineMessageIds,
  type AppendTimelineMergeResult,
} from './timeline-feed-diff.js';

export {
  snapshotStats,
  type AgentIdentity,
  type AgentObservabilityRecord,
  type AgentLink,
  type TraceGraphEdge,
  type TraceGraphLayoutHint,
  type TraceGraphNode,
  type TraceGraphResponse,
  type TraceGraphView,
  type JsonWebKeyPublic,
  type PlaygroundSnapshot,
  type PlaygroundSnapshotResponse,
  type PublicKeyMaterial,
  type SnapshotStats,
  type TraceBundle,
  type TraceListEntry,
  type TraceTimelineEvent,
} from './types.js';
