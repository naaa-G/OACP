import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'vitest';

import type { AgentIdentity } from '../../src/protocol/agent-types.js';
import type { OacpMessage } from '../../src/protocol/message-schemas.js';
import { parseAgentIdentity } from '../../src/protocol/agent-identity.js';
import { validateMessage } from '../../src/protocol/message-validator.js';
import type { InMemoryMessageBus } from '../../src/routing/message-bus.js';
import { getSchemasRoot } from '../../src/protocol/schema-registry.js';

/** Load the canonical summarizer identity fixture. */
export function loadSummarizerIdentity(): AgentIdentity {
  const raw = JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'agent-identity.example.json'), 'utf8'),
  ) as unknown;
  return parseAgentIdentity(raw);
}

/** Coordinator identity for integration scenarios. */
export function createCoordinatorIdentity(): AgentIdentity {
  return {
    ...loadSummarizerIdentity(),
    id: 'agent://coordinator',
    name: 'Coordinator',
    capabilities: ['orchestrate'],
  };
}

/** Assert every message in a trace is protocol-valid. */
export function assertTraceMessagesValid(bus: InMemoryMessageBus, traceId: string): OacpMessage[] {
  const messages = bus.getMessagesForTrace(traceId);
  expect(messages.length).toBeGreaterThan(0);

  for (const message of messages) {
    const outcome = validateMessage(message);
    expect(outcome.valid, `message ${message.message_id} should be valid`).toBe(true);
  }

  return [...messages];
}

/** Assert request/response correlation on a completed task flow. */
export function assertTaskCorrelation(
  requestMessageId: string,
  response: { in_reply_to: string; trace_id: string; from: string },
  traceId: string,
  workerId: string,
): void {
  expect(response.in_reply_to).toBe(requestMessageId);
  expect(response.trace_id).toBe(traceId);
  expect(response.from).toBe(workerId);
}
