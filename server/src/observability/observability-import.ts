import type { AgentIdentity, OacpMessage } from '@oacp/core';

import type { ServerContext } from '../api/http/types.js';
import type {
  ObservabilityImportResult,
  ObservabilityImportTrace,
  ObservabilityPersistence,
} from './observability-persistence.js';
import { recordAgentRegisteredEvent } from './observability-event-emitter.js';
import { synthesizeTraceObservabilityEvents } from './observability-event-backfill.js';

function touchAgentsFromMessage(persistence: ObservabilityPersistence, message: OacpMessage): void {
  persistence.touchAgentLastSeen(message.from, message.timestamp);
  if (message.type === 'task_request' || message.type === 'delegation') {
    if (message.to !== undefined) {
      persistence.touchAgentLastSeen(message.to, message.timestamp);
    }
  }
}

/** Hydrate in-memory bus + registry from SQLite on startup (Day 53). */
export function hydrateObservabilityFromPersistence(context: ServerContext): void {
  const { observabilityPersistence: persistence } = context;
  if (!persistence.enabled) {
    return;
  }

  for (const identity of persistence.listAgents()) {
    try {
      context.registry.register(identity, { replace: true });
      context.bus.register(identity.id, undefined, {
        capabilities: identity.capabilities,
        useMailbox: true,
      });
    } catch {
      // Registry conflicts should not block startup hydration.
    }
  }

  for (const traceId of persistence.listTraceIds()) {
    for (const message of persistence.getTraceMessages(traceId)) {
      context.bus.replayTraceMessage(message);
    }
  }
}

/** Idempotent trace import for MCPLab backfill and POST /v1/observability/import. */
export async function importObservabilityTrace(
  context: ServerContext,
  payload: ObservabilityImportTrace,
): Promise<ObservabilityImportResult> {
  const persistence = context.observabilityPersistence;
  let importedMessages = 0;
  let skippedMessages = 0;
  let registeredAgents = 0;

  const agents = payload.agents ?? [];
  for (const identity of agents) {
    const isNew = context.registry.get(identity.id) === undefined;
    persistence.upsertAgent(identity);
    const agent = context.registry.register(identity, { replace: true });
    context.bus.register(agent.id, undefined, {
      capabilities: agent.capabilities,
      useMailbox: true,
    });
    recordAgentRegisteredEvent(context.observabilityEventBus, agent);
    if (isNew) {
      registeredAgents += 1;
    }
  }

  const sortedMessages = [...payload.messages].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );

  for (const message of sortedMessages) {
    if (message.trace_id !== payload.trace_id) {
      continue;
    }

    const alreadyInBus = context.bus.getMessageById(message.message_id) !== undefined;
    const appended = persistence.enabled ? persistence.appendMessage(message) : !alreadyInBus;

    if (!appended) {
      skippedMessages += 1;
      context.bus.replayTraceMessage(message);
      continue;
    }

    importedMessages += 1;
    context.bus.replayTraceMessage(message);
    if (persistence.enabled) {
      touchAgentsFromMessage(persistence, message);
    }

    try {
      await context.taskRecorder.recordMessage(message);
    } catch {
      // Best-effort memory persistence.
    }

    try {
      await context.delegationGraphRecorder.recordMessage(message);
    } catch {
      // Best-effort graph persistence.
    }
  }

  if (importedMessages > 0 || skippedMessages > 0) {
    const replayed = persistence.enabled
      ? persistence.getTraceMessages(payload.trace_id)
      : context.bus.getMessagesForTrace(payload.trace_id);
    for (const event of synthesizeTraceObservabilityEvents(replayed)) {
      context.observabilityEventBus.record({
        type: event.type,
        timestamp: event.timestamp,
        data: event.data,
      });
    }
  }

  return {
    trace_id: payload.trace_id,
    imported_messages: importedMessages,
    skipped_messages: skippedMessages,
    registered_agents: registeredAgents,
  };
}

export function registerAgentWithPersistence(
  context: ServerContext,
  identity: AgentIdentity,
  options: { replace?: boolean } = {},
): AgentIdentity {
  const agent = context.registry.register(identity, options);
  context.observabilityPersistence.upsertAgent(agent);
  return agent;
}

export function persistOutboundMessage(context: ServerContext, message: OacpMessage): void {
  const persistence = context.observabilityPersistence;
  if (!persistence.enabled) {
    return;
  }

  persistence.appendMessage(message);
  touchAgentsFromMessage(persistence, message);
}
