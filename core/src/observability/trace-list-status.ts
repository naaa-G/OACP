import type { OacpMessage } from '../protocol/message-schemas.js';

export type TraceListStatus = 'running' | 'completed' | 'failed';

export interface TraceListStatusResult {
  readonly status: TraceListStatus;
  readonly completedAt?: string;
}

/** Infer trace lifecycle from terminal `task_response` messages. */
export function inferTraceListStatusFromMessages(
  messages: readonly OacpMessage[],
): TraceListStatusResult {
  if (messages.length === 0) {
    return { status: 'running' };
  }

  const sorted = [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const last = sorted[sorted.length - 1];
  if (last === undefined) {
    return { status: 'running' };
  }

  if (last.type === 'task_response') {
    return {
      status: last.status === 'error' ? 'failed' : 'completed',
      completedAt: last.timestamp,
    };
  }

  return { status: 'running' };
}
