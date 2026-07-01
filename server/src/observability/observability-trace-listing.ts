import type { OacpMessage } from '@oacp/core';

import type { TraceServiceContext } from './trace-service.js';

/** Resolve messages for a trace from bus or persistence. */
export function resolveTraceMessages(
  context: TraceServiceContext,
  traceId: string,
): readonly OacpMessage[] {
  const busMessages = context.bus.getMessagesForTrace(traceId);
  if (busMessages.length > 0) {
    return busMessages;
  }

  return context.observabilityPersistence.getTraceMessages(traceId);
}
