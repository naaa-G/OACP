import { InMemoryMessageBus, createMessageBus } from '@oacp/core';

/** Alias for the in-process OACP message bus (Day 5). */
export { InMemoryMessageBus, createMessageBus };

/** Ergonomic alias used in SDK examples and quick starts. */
export class LocalBus extends InMemoryMessageBus {}
