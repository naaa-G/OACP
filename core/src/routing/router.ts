import type { OacpMessage } from '../protocol/message-schemas.js';
import { ROUTING_ERROR_CODES, OacpRoutingError } from './errors.js';
import type { TraceStore } from './trace-store.js';

export type RouteResolution =
  | { ok: true; recipients: readonly string[] }
  | { ok: false; error: OacpRoutingError };

export type CapabilityRoutingMode = 'first' | 'all';

export interface RouterState {
  readonly registeredAgents: ReadonlySet<string>;
  readonly capabilityIndex: ReadonlyMap<string, ReadonlySet<string>>;
}

export interface RouterOptions {
  /** How to resolve capability-based routes when multiple agents match. */
  readonly capabilityRoutingMode?: CapabilityRoutingMode;
  /** Agent URI used for `capability_query` when no `to` is set. */
  readonly registryAgentUri?: string;
}

const DEFAULT_REGISTRY_URI = 'agent://registry';

/**
 * Resolves message recipients for the in-process bus.
 * Direct `to` routing takes precedence; capability index is the fallback.
 */
export function resolveRoute(
  message: OacpMessage,
  state: RouterState,
  traceStore: TraceStore,
  options: RouterOptions = {},
): RouteResolution {
  const mode = options.capabilityRoutingMode ?? 'first';
  const registryUri = options.registryAgentUri ?? DEFAULT_REGISTRY_URI;

  switch (message.type) {
    case 'task_request':
    case 'delegation':
      return resolveDirectOrCapability(message, state, mode);

    case 'task_response':
      return resolveTaskResponse(message, traceStore);

    case 'capability_query':
      return resolveCapabilityQuery(message, state, registryUri);

    default: {
      const _exhaustive: never = message;
      return {
        ok: false,
        error: new OacpRoutingError(
          ROUTING_ERROR_CODES.UNKNOWN_MESSAGE,
          `Cannot route message type "${(_exhaustive as OacpMessage).type}"`,
        ),
      };
    }
  }
}

function resolveDirectOrCapability(
  message: Extract<OacpMessage, { type: 'task_request' | 'delegation' }>,
  state: RouterState,
  mode: CapabilityRoutingMode,
): RouteResolution {
  if (message.to) {
    return resolveDirectRecipient(message.to, state);
  }
  return resolveByCapability(message.capability, state, mode);
}

function resolveDirectRecipient(agentUri: string, state: RouterState): RouteResolution {
  if (!state.registeredAgents.has(agentUri)) {
    return {
      ok: false,
      error: new OacpRoutingError(
        ROUTING_ERROR_CODES.AGENT_NOT_REGISTERED,
        `Agent "${agentUri}" is not registered on the bus`,
        [{ path: '/to', message: `No handler registered for ${agentUri}` }],
      ),
    };
  }
  return { ok: true, recipients: [agentUri] };
}

/** Sort agent URIs for deterministic capability routing (enterprise load-sharing baseline). */
export function sortAgentsByUri(agents: Iterable<string>): string[] {
  return [...agents].sort((a, b) => a.localeCompare(b));
}

function resolveByCapability(
  capability: string,
  state: RouterState,
  mode: CapabilityRoutingMode,
): RouteResolution {
  const agents = state.capabilityIndex.get(capability);
  if (!agents || agents.size === 0) {
    return {
      ok: false,
      error: new OacpRoutingError(
        ROUTING_ERROR_CODES.NO_RECIPIENT,
        `No registered agent declares capability "${capability}"`,
        [{ path: '/capability', message: `No agents found for ${capability}` }],
      ),
    };
  }

  const sorted = sortAgentsByUri(agents);
  const recipients = mode === 'all' ? sorted : [sorted[0] as string];
  return { ok: true, recipients };
}

function resolveTaskResponse(
  message: Extract<OacpMessage, { type: 'task_response' }>,
  traceStore: TraceStore,
): RouteResolution {
  const original = traceStore.getMessageById(message.in_reply_to);
  if (!original) {
    return {
      ok: false,
      error: new OacpRoutingError(
        ROUTING_ERROR_CODES.NO_RECIPIENT,
        `Cannot route task_response: original message "${message.in_reply_to}" not found`,
        [{ path: '/in_reply_to', message: 'Referenced message_id is unknown to this bus' }],
      ),
    };
  }

  const recipient = original.from;
  return { ok: true, recipients: [recipient] };
}

function resolveCapabilityQuery(
  message: Extract<OacpMessage, { type: 'capability_query' }>,
  state: RouterState,
  registryUri: string,
): RouteResolution {
  if (state.registeredAgents.has(registryUri)) {
    return { ok: true, recipients: [registryUri] };
  }

  const agents = state.capabilityIndex.get(message.capability);
  if (agents && agents.size > 0) {
    const sorted = sortAgentsByUri(agents);
    return { ok: true, recipients: [sorted[0] as string] };
  }

  return {
    ok: false,
    error: new OacpRoutingError(
      ROUTING_ERROR_CODES.NO_RECIPIENT,
      `No registry or capability handler for "${message.capability}"`,
      [{ path: '/capability', message: `Register agent://${registryUri} or declare capability` }],
    ),
  };
}
