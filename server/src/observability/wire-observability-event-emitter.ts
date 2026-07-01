import type { OacpMessage } from '@oacp/core';

import type { ServerConfig } from '../config.js';
import type { ServerContext } from '../api/http/types.js';

import {
  isRootTraceCompletion,
  publishMessageObservabilityEvents,
} from './observability-event-emitter.js';
import { persistOutboundMessage } from './observability-import.js';
import { mirrorTraceCompletionToMcplab } from './mcplab-sync.js';

/** Tap all bus sends so agent runtime replies emit SSE events (Day 46). */
export function wireObservabilityEventEmitter(
  context: ServerContext,
  config: Partial<ServerConfig> = {},
): void {
  const bus = context.bus;
  const originalSend = bus.send.bind(bus);

  bus.send = async (message: OacpMessage) => {
    const messagesBeforeSend = bus.getMessagesForTrace(message.trace_id).length;
    const outcome = await originalSend(message);

    if (outcome.ok) {
      persistOutboundMessage(context, outcome.message);
      const traceMessages = bus.getMessagesForTrace(message.trace_id);
      const rootMessageId = traceMessages[0]?.message_id;
      publishMessageObservabilityEvents(context.observabilityEventBus, outcome.message, {
        recipients: outcome.recipients,
        isNewTrace: messagesBeforeSend === 0,
        traceMessageCount: traceMessages.length,
        rootMessageId,
      });

      if (isRootTraceCompletion(outcome.message, rootMessageId)) {
        void mirrorTraceCompletionToMcplab(config, {
          trace_id: outcome.message.trace_id,
          message_count: traceMessages.length,
          completed_at: outcome.message.timestamp,
        }).catch(() => {
          // MCPLab status mirror must not fail message delivery.
        });
      }
    }

    return outcome;
  };
}
