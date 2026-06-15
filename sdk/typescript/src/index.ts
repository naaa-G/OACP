export { PACKAGE_VERSION as CORE_VERSION, PROTOCOL_VERSION } from '@oacp/core';
export type { DeliveryGuarantee } from '@oacp/core';
export {
  DEFAULT_RETRY_POLICY,
  REMOTE_CLIENT_DELIVERY_GUARANTEE,
  computeBackoffMs,
  executeClientRetry,
  executeWithRetry,
  isRetryableClientError,
} from './client/retry.js';
export type { RetryPolicy } from './client/retry.js';
export {
  CORE_MESSAGE_TYPES,
  MESSAGE_TYPES,
  ROUTING_ERROR_CODES,
  RUNTIME_ERROR_CODES,
  TASK_STATUS,
  VALIDATION_ERROR_CODES,
  AgentRuntime,
  CapabilityCatalog,
  InMemoryMessageBus,
  MessageValidator,
  OacpRoutingError,
  OacpRuntimeError,
  OacpValidationError,
  createAgentRuntime,
  createMessageBus,
  parseAgentIdentity,
  parseMessage,
  validateAgentIdentity,
  validateMessage,
  createInMemoryMemoryStore,
  createTaskMemoryRecorder,
  createDelegationGraphRecorder,
  createInMemoryDelegationGraphStore,
  buildDelegationGraphFromMemoryEntries,
  buildDelegationGraphFromMessages,
  delegationTopologicalOrder,
  getDelegationAncestors,
  getDelegationDescendants,
  DEFAULT_MEMORY_SCOPE,
  MemoryScopeManager,
  TaskMemoryRecorder,
  DelegationGraphRecorder,
  WORKFLOW_ERROR_CODES,
  OacpWorkflowError,
  validateSubtaskPlan,
  planExecutionBatches,
  decomposeAndExecute,
  executeSubtaskPlan,
  createStaticSubtaskPlanner,
  createFunctionSubtaskPlanner,
  WorkflowEngine,
  createWorkflowEngine,
  runWorkflow,
  validateWorkflowDefinition,
  sendTaskWithRecovery,
  DEFAULT_TASK_RECOVERY_POLICY,
  executeStepTask,
  createConsoleLogger,
  noopLogger,
  buildTraceTimeline,
  formatTraceTimeline,
  buildTraceBundle,
  buildTraceBundleFromRecord,
  TraceClient,
  createTraceClient,
} from '@oacp/core';
export type {
  OacpLogger,
  OacpLogContext,
  TraceBundle,
  TraceTimelineEvent,
  TraceListEntry,
} from '@oacp/core';
export type {
  DelegationEdge,
  DelegationGraph,
  DelegationNode,
  DelegationGraphStore,
  SubtaskPlan,
  SubtaskPlanStep,
  SubtaskPlanStepResult,
  SubtaskPlanExecutionResult,
  SubtaskPlanner,
  SubtaskPlannerContext,
  ExecuteSubtaskPlanOptions,
  DecomposeAndExecuteOptions,
  WorkflowDefinition,
  WorkflowRunRecord,
  WorkflowRunResult,
  WorkflowEngineOptions,
  TaskRecoveryPolicy,
  TaskRecoveryAttempt,
  ResilientSendTaskOutcome,
  SendTaskWithRecoveryOptions,
} from '@oacp/core';
export type {
  AgentIdentity,
  AgentLifecycleState,
  BusStats,
  CapabilityDeclaration,
  CoreMessageType,
  DeliveryContext,
  ExecutionContext,
  MemoryEntry,
  MemoryEntryKind,
  MemoryQuery,
  MemoryStore,
  MessageHandler,
  MessageType,
  OacpMessage,
  SendOutcome,
  SendTaskOutcome,
  SendTaskParams,
  TaskExecutionContext,
  TaskHandler,
  TaskHandlerResult,
  TaskStatus,
  ValidateOutcome,
} from '@oacp/core';

export { TaskPipeline, runPipeline } from './pipeline.js';
export type {
  PipelineContext,
  PipelineRunFailure,
  PipelineRunResult,
  PipelineRunSuccess,
  PipelineStep,
  PipelineStepResult,
  RunPipelineOptions,
  TaskPipelineOptions,
} from './pipeline.js';

export { Agent } from './agent.js';
export type { AgentOptions, AgentTaskResult } from './agent.js';
export { LocalBus, createMessageBus as createLocalBus } from './bus.js';
export { DEFAULT_DEV_PUBLIC_KEY } from './defaults.js';

export { AgentClient, createAgentClient } from './client/agent-client.js';
export type { AgentClientOptions } from './client/agent-client.js';
export { registerDevAgent } from './client/dev-helpers.js';
export type { RegisterDevAgentParams } from './client/dev-helpers.js';
export { CLIENT_ERROR_CODES, OacpClientError } from './client/errors.js';
export type { ClientErrorCode, ClientErrorDetail } from './client/errors.js';
export type {
  CapabilityDiscoveryResult,
  FindAgentsByCapabilityOptions,
  HealthCheckResult,
  ListAgentsOptions,
  MessageRoutingInfo,
  MessageRoutingMode,
  ReceiveMessageResult,
  RegisterAgentOptions,
  RemoteSendTaskParams,
  SendMessageResult,
  WorkflowRunRemoteResult,
} from './client/types.js';

/** @oacp/sdk package version. */
export const SDK_VERSION = '0.1.0' as const;
