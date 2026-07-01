import type { AgentIdentity, OacpMessage } from '@oacp/core';
import type {
  AgentRegisteredEventData,
  MessageAppendedEventData,
  TraceCompletedEventData,
  TraceStartedEventData,
} from '@oacp/observability-client';

import type { ObservabilityEventBus, ObservabilityEventInput } from './observability-event-bus.js';

function readAgentMetadataField(agent: AgentIdentity, field: 'fleet' | 'role'): string | undefined {
  const metadata = agent.metadata;
  if (metadata === undefined) {
    return undefined;
  }

  const value = metadata[field];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function buildMessageAppendedEventData(
  message: OacpMessage,
  recipients: readonly string[] = [],
): MessageAppendedEventData {
  const base = {
    trace_id: message.trace_id,
    message_id: message.message_id,
    message_type: message.type,
    from: message.from,
    timestamp: message.timestamp,
    ...(recipients.length > 0 ? { recipients } : {}),
  };

  if (message.type === 'task_request' || message.type === 'delegation') {
    return {
      ...base,
      ...(message.to !== undefined ? { to: message.to } : {}),
      capability: message.capability,
    };
  }

  if (message.type === 'task_response') {
    return {
      ...base,
      status: message.status,
    };
  }

  return base;
}

export function buildTraceStartedEventData(message: OacpMessage): TraceStartedEventData {
  return {
    trace_id: message.trace_id,
    started_at: message.timestamp,
    root_message_id: message.message_id,
    from: message.from,
  };
}

export function buildTraceCompletedEventData(
  message: Extract<OacpMessage, { type: 'task_response' }>,
  messageCount: number,
): TraceCompletedEventData {
  return {
    trace_id: message.trace_id,
    completed_at: message.timestamp,
    message_count: messageCount,
    status: message.status,
    completing_message_id: message.message_id,
  };
}

export function isRootTraceCompletion(
  message: OacpMessage,
  rootMessageId: string | undefined,
): message is Extract<OacpMessage, { type: 'task_response' }> {
  return (
    message.type === 'task_response' &&
    rootMessageId !== undefined &&
    message.in_reply_to === rootMessageId
  );
}

function buildAgentRegisteredEventInput(agent: AgentIdentity): ObservabilityEventInput {
  const fleet = readAgentMetadataField(agent, 'fleet');
  const role = readAgentMetadataField(agent, 'role');
  const data: AgentRegisteredEventData = {
    agent_id: agent.id,
    name: agent.name,
    capabilities: agent.capabilities,
    ...(fleet !== undefined ? { fleet } : {}),
    ...(role !== undefined ? { role } : {}),
  };

  return {
    type: 'agent.registered',
    timestamp: new Date().toISOString(),
    data,
  };
}

export function publishAgentRegisteredEvent(
  eventBus: ObservabilityEventBus,
  agent: AgentIdentity,
): void {
  eventBus.publish(buildAgentRegisteredEventInput(agent));
}

/** Buffer agent registration for SSE replay without fan-out to live subscribers. */
export function recordAgentRegisteredEvent(
  eventBus: ObservabilityEventBus,
  agent: AgentIdentity,
): void {
  eventBus.record(buildAgentRegisteredEventInput(agent));
}

export function publishMessageObservabilityEvents(
  eventBus: ObservabilityEventBus,
  message: OacpMessage,
  options: {
    readonly recipients?: readonly string[];
    readonly isNewTrace: boolean;
    readonly traceMessageCount: number;
    readonly rootMessageId?: string | undefined;
  },
): void {
  const timestamp = new Date().toISOString();

  if (options.isNewTrace) {
    eventBus.publish({
      type: 'trace.started',
      timestamp,
      data: buildTraceStartedEventData(message),
    });
  }

  eventBus.publish({
    type: 'message.appended',
    timestamp,
    data: buildMessageAppendedEventData(message, options.recipients ?? []),
  });

  if (isRootTraceCompletion(message, options.rootMessageId)) {
    eventBus.publish({
      type: 'trace.completed',
      timestamp,
      data: buildTraceCompletedEventData(message, options.traceMessageCount),
    });
  }
}
