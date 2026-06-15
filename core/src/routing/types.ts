import type { OacpMessage } from '../protocol/message-schemas.js';
import type { OacpRoutingError } from './errors.js';
import type { OacpValidationError } from '../protocol/errors.js';
import type { TraceRecord } from './trace-store.js';

/** Narrow bus surface exposed to message handlers. */
export interface BusHandle {
  getTrace(traceId: string): TraceRecord | undefined;
  getMessagesForTrace(traceId: string): readonly OacpMessage[];
  getMessageById(messageId: string): OacpMessage | undefined;
  findAgentsByCapability(capability: string): readonly string[];
}

/** Handler invoked when a message is delivered to a registered agent. */
export type MessageHandler = (
  message: OacpMessage,
  context: DeliveryContext,
) => void | Promise<void>;

/** Context passed to message handlers during delivery. */
export interface DeliveryContext {
  readonly agentUri: string;
  readonly traceId: string;
  readonly deliveredAt: string;
  readonly bus: BusHandle;
}

/** Per-recipient delivery report. */
export interface DeliveryReport {
  readonly agentUri: string;
  readonly success: boolean;
  readonly error?: Error;
}

/** Successful send outcome. */
export interface SendSuccess {
  readonly ok: true;
  readonly message: OacpMessage;
  readonly recipients: readonly string[];
  readonly deliveries: readonly DeliveryReport[];
}

/** Failed send outcome (validation or routing). */
export interface SendFailure {
  readonly ok: false;
  readonly error: OacpValidationError | OacpRoutingError;
}

export type SendOutcome = SendSuccess | SendFailure;

/** Internal mailbox for pull-based receive. */
export interface AgentMailbox {
  readonly queue: OacpMessage[];
  readonly waiters: Array<(message: OacpMessage) => void>;
}

/** Agent registration on the in-memory bus. */
export interface AgentRegistration {
  readonly agentUri: string;
  readonly handler?: MessageHandler;
  readonly capabilities: ReadonlySet<string>;
  readonly mailbox?: AgentMailbox;
}
