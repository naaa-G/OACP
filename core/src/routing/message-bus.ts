import type { OacpMessage } from '../protocol/message-schemas.js';
import { MessageValidator, defaultMessageValidator } from '../protocol/message-validator.js';
import type { MessageValidatorOptions } from '../protocol/message-validator.js';
import { ROUTING_ERROR_CODES, OacpRoutingError } from './errors.js';
import { LOCAL_BUS_DELIVERY_GUARANTEE } from './delivery-guarantees.js';
import type { DeliveryGuarantee } from './delivery-guarantees.js';
import { resolveRoute } from './router.js';
import type { CapabilityRoutingMode } from './router.js';
import { TraceStore } from './trace-store.js';
import type { ListTracesOptions, TraceListEntry, TraceRecord } from './trace-store.js';
import type {
  AgentRegistration,
  DeliveryContext,
  DeliveryReport,
  MessageHandler,
  SendOutcome,
} from './types.js';

export interface InMemoryMessageBusOptions {
  readonly validator?: MessageValidator;
  readonly validatorOptions?: MessageValidatorOptions;
  /** Validate messages before routing (default: true). */
  readonly validateOnSend?: boolean;
  /** Record messages in the trace store (default: true). */
  readonly recordTraces?: boolean;
  readonly maxMessagesPerTrace?: number;
  readonly capabilityRoutingMode?: CapabilityRoutingMode;
  readonly registryAgentUri?: string;
}

export interface BusStats {
  readonly registeredAgents: number;
  readonly capabilityCount: number;
  readonly traceCount: number;
  readonly deliveryGuarantee: DeliveryGuarantee;
  readonly isOpen: boolean;
}

/**
 * Enterprise-grade in-process message bus for OACP agents.
 * Validates on send, routes by agent URI or capability, and tracks `trace_id` correlation.
 */
export class InMemoryMessageBus {
  private readonly validator: MessageValidator;
  private readonly validateOnSend: boolean;
  private readonly recordTraces: boolean;
  private readonly capabilityRoutingMode: CapabilityRoutingMode;
  private readonly registryAgentUri: string;
  private readonly traceStore: TraceStore;
  private readonly agents = new Map<string, AgentRegistration>();
  private readonly capabilityIndex = new Map<string, Set<string>>();
  private open = true;

  constructor(options: InMemoryMessageBusOptions = {}) {
    this.validator =
      options.validator ??
      (options.validatorOptions
        ? new MessageValidator(options.validatorOptions)
        : defaultMessageValidator);
    this.validateOnSend = options.validateOnSend ?? true;
    this.recordTraces = options.recordTraces ?? true;
    this.capabilityRoutingMode = options.capabilityRoutingMode ?? 'first';
    this.registryAgentUri = options.registryAgentUri ?? 'agent://registry';
    this.traceStore = new TraceStore(
      options.maxMessagesPerTrace !== undefined
        ? { maxMessagesPerTrace: options.maxMessagesPerTrace }
        : {},
    );
  }

  /** Delivery guarantee for this transport. */
  get deliveryGuarantee(): DeliveryGuarantee {
    return LOCAL_BUS_DELIVERY_GUARANTEE;
  }

  /** Whether the bus accepts send operations. */
  get isOpen(): boolean {
    return this.open;
  }

  /**
   * Register an agent to receive routed messages.
   * @param capabilities — used for capability-based routing when `to` is omitted.
   * @param useMailbox — queue messages for pull-based `waitForMessage()`.
   * @param replace — when `false` (default), merge with an existing registration (preserve handler).
   */
  register(
    agentUri: string,
    handler?: MessageHandler,
    options: {
      capabilities?: readonly string[];
      useMailbox?: boolean;
      replace?: boolean;
    } = {},
  ): void {
    const existing = this.agents.get(agentUri);
    const replace = options.replace ?? false;

    if (existing && !replace) {
      this.mergeRegistration(agentUri, existing, handler, options);
      return;
    }

    if (existing) {
      this.unindexAgent(agentUri, existing.capabilities);
    }

    const capabilities = new Set(options.capabilities ?? []);
    const mailbox = options.useMailbox ? { queue: [], waiters: [] } : undefined;
    const registration: AgentRegistration = {
      agentUri,
      capabilities,
      ...(handler !== undefined ? { handler } : {}),
      ...(mailbox !== undefined ? { mailbox } : {}),
    };
    this.agents.set(agentUri, registration);
    this.indexAgent(agentUri, capabilities);
  }

  /** Remove an agent and its capability index entries. */
  unregister(agentUri: string): boolean {
    const registration = this.agents.get(agentUri);
    if (!registration) {
      return false;
    }

    this.unindexAgent(agentUri, registration.capabilities);
    return this.agents.delete(agentUri);
  }

  /** List registered agent URIs. */
  listRegisteredAgents(): string[] {
    return [...this.agents.keys()].sort();
  }

  /** Agents that declared a given capability. */
  findAgentsByCapability(capability: string): readonly string[] {
    const agents = this.capabilityIndex.get(capability);
    return agents ? [...agents].sort() : [];
  }

  /**
   * Send a validated message through the bus.
   * Records the message in the trace store before delivery.
   */
  async send(message: OacpMessage): Promise<SendOutcome> {
    if (!this.open) {
      return {
        ok: false,
        error: new OacpRoutingError(ROUTING_ERROR_CODES.BUS_CLOSED, 'Message bus is closed'),
      };
    }

    if (this.validateOnSend) {
      const outcome = this.validator.validate(message);
      if (!outcome.valid) {
        return { ok: false, error: outcome.error };
      }
    }

    if (this.recordTraces) {
      this.traceStore.record(message);
    }

    const route = resolveRoute(
      message,
      {
        registeredAgents: new Set(this.agents.keys()),
        capabilityIndex: this.capabilityIndex,
      },
      this.traceStore,
      {
        capabilityRoutingMode: this.capabilityRoutingMode,
        registryAgentUri: this.registryAgentUri,
      },
    );

    if (!route.ok) {
      return { ok: false, error: route.error };
    }

    const deliveries = await this.deliver(message, route.recipients);
    const allFailed = deliveries.length > 0 && deliveries.every((d) => !d.success);

    if (allFailed) {
      return {
        ok: false,
        error: new OacpRoutingError(
          ROUTING_ERROR_CODES.DELIVERY_FAILED,
          'Message delivery failed for all recipients',
        ),
      };
    }

    return {
      ok: true,
      message,
      recipients: route.recipients,
      deliveries,
    };
  }

  /**
   * Validate and send a raw payload.
   * Prefer `send()` when you already have a typed `OacpMessage`.
   */
  async sendRaw(data: unknown): Promise<SendOutcome> {
    if (!this.open) {
      return {
        ok: false,
        error: new OacpRoutingError(ROUTING_ERROR_CODES.BUS_CLOSED, 'Message bus is closed'),
      };
    }

    const outcome = this.validator.validate(data);
    if (!outcome.valid) {
      return { ok: false, error: outcome.error };
    }

    return this.send(outcome.data);
  }

  /**
   * Wait for the next message delivered to an agent (pull-based).
   * Agent must be registered with `useMailbox: true` or a handler.
   */
  async waitForMessage(agentUri: string, timeoutMs = 5_000): Promise<OacpMessage | undefined> {
    const registration = this.agents.get(agentUri);
    if (!registration) {
      throw new OacpRoutingError(
        ROUTING_ERROR_CODES.AGENT_NOT_REGISTERED,
        `Agent "${agentUri}" is not registered`,
      );
    }

    if (!registration.mailbox) {
      throw new OacpRoutingError(
        ROUTING_ERROR_CODES.AGENT_NOT_REGISTERED,
        `Agent "${agentUri}" was not registered with useMailbox: true`,
      );
    }

    const { mailbox } = registration;
    const queued = mailbox.queue.shift();
    if (queued) {
      return queued;
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const index = mailbox.waiters.indexOf(onMessage);
        if (index >= 0) {
          mailbox.waiters.splice(index, 1);
        }
        resolve(undefined);
      }, timeoutMs);

      const onMessage = (message: OacpMessage): void => {
        clearTimeout(timer);
        resolve(message);
      };

      mailbox.waiters.push(onMessage);
    });
  }

  /**
   * Record a historical message in the trace store without routing (Day 53 import / hydrate).
   * Idempotent when the same `message_id` is replayed.
   */
  replayTraceMessage(message: OacpMessage): void {
    if (!this.recordTraces) {
      return;
    }
    if (this.traceStore.getMessageById(message.message_id) !== undefined) {
      return;
    }
    this.traceStore.record(message);
  }

  /** Get trace record by `trace_id`. */
  getTrace(traceId: string): TraceRecord | undefined {
    return this.traceStore.getTrace(traceId);
  }

  /** List active traces sorted by most recent activity. */
  listTraces(options?: ListTracesOptions): readonly TraceListEntry[] {
    return this.traceStore.listTraces(options);
  }

  /** List messages for a `trace_id` in delivery order. */
  getMessagesForTrace(traceId: string): readonly OacpMessage[] {
    return this.traceStore.getMessagesForTrace(traceId);
  }

  /** Look up a message by `message_id`. */
  getMessageById(messageId: string): OacpMessage | undefined {
    return this.traceStore.getMessageById(messageId);
  }

  /** Introspection for monitoring and tests. */
  getStats(): BusStats {
    return {
      registeredAgents: this.agents.size,
      capabilityCount: this.capabilityIndex.size,
      traceCount: this.traceStore.traceCount,
      deliveryGuarantee: this.deliveryGuarantee,
      isOpen: this.open,
    };
  }

  /** Stop accepting new messages; in-flight deliveries are not cancelled. */
  close(): void {
    this.open = false;
  }

  /** Re-open a closed bus. */
  openBus(): void {
    this.open = true;
  }

  /** Clear trace history (for tests). */
  clearTraces(): void {
    this.traceStore.clear();
  }

  private mergeRegistration(
    agentUri: string,
    existing: AgentRegistration,
    handler: MessageHandler | undefined,
    options: { capabilities?: readonly string[]; useMailbox?: boolean },
  ): void {
    this.unindexAgent(agentUri, existing.capabilities);

    const capabilities = new Set(options.capabilities ?? existing.capabilities);
    const wantsMailbox = options.useMailbox === true || existing.mailbox !== undefined;
    const mailbox = wantsMailbox ? (existing.mailbox ?? { queue: [], waiters: [] }) : undefined;

    const registration: AgentRegistration = {
      agentUri,
      capabilities,
      ...(handler !== undefined
        ? { handler }
        : existing.handler !== undefined
          ? { handler: existing.handler }
          : {}),
      ...(mailbox !== undefined ? { mailbox } : {}),
    };

    this.agents.set(agentUri, registration);
    this.indexAgent(agentUri, capabilities);
  }

  private indexAgent(agentUri: string, capabilities: ReadonlySet<string>): void {
    for (const capability of capabilities) {
      let agents = this.capabilityIndex.get(capability);
      if (!agents) {
        agents = new Set();
        this.capabilityIndex.set(capability, agents);
      }
      agents.add(agentUri);
    }
  }

  private unindexAgent(agentUri: string, capabilities: Iterable<string>): void {
    for (const capability of capabilities) {
      const agents = this.capabilityIndex.get(capability);
      if (agents) {
        agents.delete(agentUri);
        if (agents.size === 0) {
          this.capabilityIndex.delete(capability);
        }
      }
    }
  }

  private async deliver(
    message: OacpMessage,
    recipients: readonly string[],
  ): Promise<DeliveryReport[]> {
    const deliveredAt = new Date().toISOString();
    const reports: DeliveryReport[] = [];

    for (const agentUri of recipients) {
      const registration = this.agents.get(agentUri);
      if (!registration) {
        reports.push({
          agentUri,
          success: false,
          error: new OacpRoutingError(
            ROUTING_ERROR_CODES.AGENT_NOT_REGISTERED,
            `Agent "${agentUri}" is not registered`,
          ),
        });
        continue;
      }

      const context: DeliveryContext = {
        agentUri,
        traceId: message.trace_id,
        deliveredAt,
        bus: this,
      };

      try {
        if (registration.mailbox) {
          const waiter = registration.mailbox.waiters.shift();
          if (waiter) {
            waiter(message);
          } else {
            registration.mailbox.queue.push(message);
          }
        }

        if (registration.handler) {
          await registration.handler(message, context);
        }

        reports.push({ agentUri, success: true });
      } catch (error) {
        reports.push({
          agentUri,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    return reports;
  }
}

/** Create a new in-memory message bus with optional configuration. */
export function createMessageBus(options?: InMemoryMessageBusOptions): InMemoryMessageBus {
  return new InMemoryMessageBus(options);
}
