import type { CapabilityRoutingMode, OacpMessage } from '@oacp/core';
import { isCapabilityQueryMessage, isDelegationMessage, isTaskRequestMessage } from '@oacp/core';

import type { MessageRoutingInfo, RoutingContext } from '../api/http/types.js';
import { assertValidCapabilityId } from '../utils/capability-id.js';

export interface CapabilityRouterOptions {
  readonly capabilityRoutingMode?: CapabilityRoutingMode;
}

/**
 * Server-side capability routing orchestration (Day 11).
 * Ensures registry agents are bus-enrolled before auto-routing and describes routing outcomes.
 */
export class CapabilityRouter {
  private readonly mode: CapabilityRoutingMode;

  constructor(
    private readonly context: RoutingContext,
    options: CapabilityRouterOptions = {},
  ) {
    this.mode = options.capabilityRoutingMode ?? 'first';
  }

  /** Sync registry matches onto the bus so capability auto-routing can deliver. */
  prepareCapabilityRouting(message: OacpMessage): void {
    const capability = this.extractCapability(message);
    if (!capability) {
      return;
    }

    assertValidCapabilityId(capability);
    const agents = this.context.registry.findByCapability(capability, { limit: 100 });

    for (const agent of agents) {
      this.context.bus.register(agent.id, undefined, {
        capabilities: agent.capabilities,
        useMailbox: true,
      });
    }
  }

  /** Build routing metadata for successful send responses. */
  describeRouting(message: OacpMessage, recipients: readonly string[]): MessageRoutingInfo {
    const selected = recipients[0];

    if (isTaskRequestMessage(message) || isDelegationMessage(message)) {
      if (message.to) {
        return { mode: 'direct', selected_agent: message.to };
      }

      return {
        mode: 'capability',
        capability: message.capability,
        ...(selected !== undefined ? { selected_agent: selected } : {}),
        routing_mode: this.mode,
      };
    }

    if (isCapabilityQueryMessage(message)) {
      return {
        mode: 'capability',
        capability: message.capability,
        ...(selected !== undefined ? { selected_agent: selected } : {}),
      };
    }

    return {
      mode: 'direct',
      ...(selected !== undefined ? { selected_agent: selected } : {}),
    };
  }

  private extractCapability(message: OacpMessage): string | undefined {
    if (isTaskRequestMessage(message) || isDelegationMessage(message)) {
      if (message.to) {
        return undefined;
      }
      return message.capability;
    }

    if (isCapabilityQueryMessage(message)) {
      return message.capability;
    }

    return undefined;
  }
}
