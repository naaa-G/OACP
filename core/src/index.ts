export { PACKAGE_VERSION, PROTOCOL_VERSION } from './protocol/constants.js';
export type { ProtocolVersion } from './protocol/constants.js';

export { AGENT_SCHEMA_PATHS, AGENT_SCHEMA_PATH_LIST } from './protocol/agent-schema-paths.js';
export type { AgentSchemaPath } from './protocol/agent-schema-paths.js';

export type {
  AgentCapabilityRegistry,
  AgentIdentity,
  AgentPermissions,
  CapabilityDeclaration,
  JsonWebKeyPublic,
  PublicKeyMaterial,
} from './protocol/agent-types.js';

export type {
  CapabilityQueryMessage,
  DelegationMessage,
  OacpMessage,
  OacpMessageByType,
  OacpMessageEnvelope,
  TaskErrorBody,
  TaskRequestMessage,
  TaskResponseMessage,
} from './protocol/message-schemas.js';

export {
  getDeclaredCapabilities,
  isAgentUri,
  isCapabilityId,
  parseAgentIdentity,
  validateAgentIdentity,
} from './protocol/agent-identity.js';

export {
  assertIdentityRegistryConsistency,
  buildCapabilityCatalog,
  CapabilityCatalog,
  parseCapabilityDeclaration,
  parseCapabilityRegistry,
  validateCapabilityDeclaration,
  validateCapabilityRegistry,
} from './protocol/capabilities.js';

export {
  assertCanDelegate,
  assertCanInvoke,
  canAccessMemoryScope,
  canDelegate,
  canInvoke,
  parseAgentPermissions,
  validateAgentPermissions,
} from './protocol/permissions.js';

export {
  defaultMessageValidator,
  isCapabilityQueryMessage,
  isDelegationMessage,
  isTaskRequestMessage,
  isTaskResponseMessage,
  MessageValidator,
  parseMessage,
  parseMessageType,
  resetMessageValidatorCache,
  validateMessage,
  validateMessageType,
} from './protocol/message-validator.js';
export type { MessageValidatorOptions } from './protocol/message-validator.js';

export { SUPPORTED_PROTOCOL_VERSIONS, isSupportedProtocolVersion } from './protocol/versioning.js';
export type { SupportedProtocolVersion } from './protocol/versioning.js';

export { OacpValidationError, VALIDATION_ERROR_CODES, assertValid } from './protocol/errors.js';
export type {
  ValidateOutcome,
  ValidationErrorCode,
  ValidationFailure,
  ValidationIssue,
  ValidationResult,
} from './protocol/errors.js';

export {
  compileSchemaRefValidator,
  compileSchemaValidator,
  getAjv,
  resetValidatorCache,
  validateAgainstSchema,
  validateAgainstSchemaOrThrow,
} from './protocol/validator.js';

export {
  CORE_MESSAGE_TYPES,
  MESSAGE_TYPES,
  MESSAGE_TYPE_SCHEMA_PATH,
  SCHEMA_PATHS,
  TASK_STATUS,
} from './protocol/message-types.js';
export type { CoreMessageType, MessageType, TaskStatus } from './protocol/message-types.js';

export {
  getSchemasRoot,
  loadAgentSchema,
  loadAgentSchemas,
  loadBaseSchema,
  loadCoreMessageSchemas,
  loadMessageSchema,
  loadSchema,
  resolveSchemaPath,
} from './protocol/schema-registry.js';

export {
  LOCAL_BUS_DELIVERY_GUARANTEE,
  REMOTE_HTTP_DELIVERY_GUARANTEE,
} from './routing/delivery-guarantees.js';
export type { DeliveryGuarantee } from './routing/delivery-guarantees.js';

export { ROUTING_ERROR_CODES, OacpRoutingError } from './routing/errors.js';
export type { RoutingErrorCode } from './routing/errors.js';

export {
  DEFAULT_RETRY_POLICY,
  NO_RETRY_POLICY,
  computeBackoffMs,
  executeWithRetry,
  normalizeRetryPolicy,
} from './routing/retry-policy.js';
export type {
  ExecuteWithRetryOptions,
  RetryAttemptInfo,
  RetryPolicy,
} from './routing/retry-policy.js';

export { createMessageBus, InMemoryMessageBus } from './routing/message-bus.js';
export type { BusStats, InMemoryMessageBusOptions } from './routing/message-bus.js';

export { resolveRoute, sortAgentsByUri } from './routing/router.js';
export type {
  CapabilityRoutingMode,
  RouteResolution,
  RouterOptions,
  RouterState,
} from './routing/router.js';

export { TraceStore } from './routing/trace-store.js';
export type {
  TraceRecord,
  TraceStoreOptions,
  TraceListEntry,
  ListTracesOptions,
} from './routing/trace-store.js';

export type {
  AgentMailbox,
  AgentRegistration,
  BusHandle,
  DeliveryContext,
  DeliveryReport,
  MessageHandler,
  SendFailure,
  SendOutcome,
  SendSuccess,
} from './routing/types.js';

export { RUNTIME_ERROR_CODES, OacpRuntimeError } from './runtime/errors.js';
export type { RuntimeErrorCode } from './runtime/errors.js';

export { ExecutionContext } from './runtime/execution-context.js';

export {
  AGENT_LIFECYCLE_STATES,
  LIFECYCLE_TRANSITIONS,
  canTransition,
} from './runtime/lifecycle.js';
export type { AgentLifecycleState } from './runtime/lifecycle.js';

export {
  buildDelegation,
  buildTaskRequest,
  buildTaskResponse,
  createMessageId,
  createTraceId,
} from './runtime/message-factory.js';
export type {
  BuildDelegationParams,
  BuildTaskRequestParams,
  BuildTaskResponseParams,
} from './runtime/message-factory.js';

export { AgentRuntime, createAgentRuntime } from './runtime/agent-runtime.js';
export type { AgentRuntimeOptions } from './runtime/agent-runtime.js';

export { TaskPipeline, runPipeline } from './runtime/pipeline.js';
export type {
  PipelineContext,
  PipelineRunFailure,
  PipelineRunResult,
  PipelineRunSuccess,
  PipelineStep,
  PipelineStepResult,
  RunPipelineOptions,
  TaskPipelineOptions,
} from './runtime/pipeline.js';

export type {
  DelegateParams,
  RuntimeHandle,
  SendTaskFailure,
  SendTaskOutcome,
  SendTaskParams,
  SendTaskSuccess,
  TaskExecutionContext,
  TaskHandler,
  TaskHandlerResult,
} from './runtime/types.js';

export { MEMORY_ERROR_CODES, OacpMemoryError } from './memory/errors.js';
export type { MemoryErrorCode } from './memory/errors.js';

export { DEFAULT_MEMORY_SCOPE, MemoryScopeManager } from './memory/scope-manager.js';
export type { MemoryScopeManagerOptions } from './memory/scope-manager.js';

export { InMemoryMemoryStore, createInMemoryMemoryStore } from './memory/in-memory-store.js';

export { TaskMemoryRecorder, createTaskMemoryRecorder } from './memory/task-recorder.js';
export type { RecordDecisionParams, TaskMemoryRecorderOptions } from './memory/task-recorder.js';

export {
  buildDelegationGraphFromMemoryEntries,
  buildDelegationGraphFromMessages,
  delegationTopologicalOrder,
  getDelegationAncestors,
  getDelegationDescendants,
} from './memory/delegation-graph-builder.js';

export {
  DelegationGraphRecorder,
  createDelegationGraphRecorder,
} from './memory/delegation-graph-recorder.js';
export type { DelegationGraphRecorderOptions } from './memory/delegation-graph-recorder.js';

export {
  InMemoryDelegationGraphStore,
  createInMemoryDelegationGraphStore,
} from './memory/in-memory-delegation-graph-store.js';

export type {
  DelegationEdge,
  DelegationEdgeKind,
  DelegationGraph,
  DelegationGraphStore,
  DelegationNode,
  DelegationNodeKind,
  RecordDelegationMessageOptions,
} from './memory/delegation-graph-types.js';

export type {
  MemoryBackend,
  MemoryEntry,
  MemoryEntryInput,
  MemoryEntryKind,
  MemoryQuery,
  MemoryStore,
  MemoryStoreConfig,
} from './memory/types.js';

export { WORKFLOW_ERROR_CODES, OacpWorkflowError } from './workflow/errors.js';
export type { WorkflowErrorCode } from './workflow/errors.js';

export { validateSubtaskPlan, planExecutionBatches } from './workflow/plan-validation.js';

export { decomposeAndExecute, executeSubtaskPlan } from './workflow/execute-subtask-plan.js';

export { executeDagPlan } from './workflow/dag-executor.js';
export type { DagStepExecutionContext, DagStepHandler } from './workflow/dag-executor.js';

export { runWorkflow } from './workflow/run-workflow.js';

export { WorkflowEngine, createWorkflowEngine } from './workflow/workflow-engine.js';

export {
  InMemoryWorkflowRunStore,
  createInMemoryWorkflowRunStore,
} from './workflow/workflow-run-store.js';
export type { WorkflowRunStore } from './workflow/workflow-run-store.js';

export { validateWorkflowDefinition } from './workflow/workflow-definition.js';
export { workflowDefinitionToPlan } from './workflow/workflow-definition-types.js';

export {
  StaticSubtaskPlanner,
  FunctionSubtaskPlanner,
  createStaticSubtaskPlanner,
  createFunctionSubtaskPlanner,
} from './workflow/subtask-planner.js';

export type {
  DecomposeAndExecuteOptions,
  ExecuteSubtaskPlanOptions,
  SubtaskPlan,
  SubtaskPlanContext,
  SubtaskPlanExecutionFailure,
  SubtaskPlanExecutionResult,
  SubtaskPlanExecutionSuccess,
  SubtaskPlanStep,
  SubtaskPlanStepResult,
  SubtaskPlanner,
  SubtaskPlannerContext,
} from './workflow/subtask-plan-types.js';

export type {
  RunWorkflowOptions,
  WorkflowDefinition,
  WorkflowEngineOptions,
  WorkflowRunFailure,
  WorkflowRunRecord,
  WorkflowRunResult,
  WorkflowRunStatus,
  WorkflowRunSuccess,
  WorkflowStep,
} from './workflow/workflow-definition-types.js';

export {
  DEFAULT_TASK_RECOVERY_POLICY,
  DEFAULT_RETRYABLE_TRANSPORT_ERROR_CODES,
  normalizeTaskRecoveryPolicy,
  mergeRecoveryPolicies,
  buildCapabilityChain,
  isRetryableTransportError,
  isRetryableTaskError,
} from './resilience/recovery-policy.js';
export type {
  TaskRecoveryPolicy,
  NormalizedTaskRecoveryPolicy,
} from './resilience/recovery-policy.js';

export { sendTaskWithRecovery } from './resilience/resilient-send.js';
export type {
  TaskRecoveryAttempt,
  TaskRecoveryAttemptOutcome,
  ResilientSendTaskOutcome,
  ResilientSendTaskSuccess,
  ResilientSendTaskFailure,
  SendTaskWithRecoveryOptions,
} from './resilience/resilient-send.js';

export { executeStepTask } from './resilience/step-executor.js';
export type { StepTaskContext, StepTaskExecutionOptions } from './resilience/step-executor.js';

export { createConsoleLogger, noopLogger } from './observability/logger.js';
export type {
  CreateConsoleLoggerOptions,
  OacpLogContext,
  OacpLogEntry,
  OacpLogLevel,
  OacpLogger,
} from './observability/logger.js';

export { buildTraceTimeline, formatTraceTimeline } from './observability/trace-timeline.js';
export type {
  FormatTraceTimelineOptions,
  TraceTimelineEvent,
} from './observability/trace-timeline.js';

export { messagesFromDelegationGraph } from './observability/graph-messages.js';

export { buildTraceBundle, buildTraceBundleFromRecord } from './observability/trace-bundle.js';
export type { BuildTraceBundleInput, TraceBundle } from './observability/trace-bundle.js';

export { TraceClient, TraceClientError, createTraceClient } from './observability/trace-client.js';
export type {
  TraceClientOptions,
  TraceDetailResponse,
  TraceListResponse,
} from './observability/trace-client.js';
