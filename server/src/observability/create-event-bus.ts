import type { ObservabilityEvent } from '@oacp/observability-client';

import {
  InMemoryObservabilityEventBus,
  type ObservabilityEventBus,
} from './observability-event-bus.js';

export interface ObservabilityEventBusFactoryOptions {
  readonly maxEvents?: number | undefined;
  readonly redisUrl?: string | undefined;
  readonly redisChannel?: string | undefined;
}

export interface RedisObservabilityFanout {
  close(): Promise<void>;
}

/** Optional Redis pub/sub fanout for multi-instance deployments (Day 46). */
export async function attachRedisObservabilityFanout(
  eventBus: ObservabilityEventBus,
  options: {
    readonly redisUrl: string;
    readonly channel?: string | undefined;
    readonly instanceId?: string | undefined;
  },
): Promise<RedisObservabilityFanout> {
  const { createClient } = await import('redis');
  const channel = options.channel ?? 'oacp:observability:events';
  const instanceId = options.instanceId ?? `instance-${process.pid}`;

  const publisher = createClient({ url: options.redisUrl });
  const subscriber = createClient({ url: options.redisUrl });

  await publisher.connect();
  await subscriber.connect();

  const localUnsubscribe = eventBus.subscribe((event) => {
    void publisher.publish(
      channel,
      JSON.stringify({
        origin: instanceId,
        event,
      }),
    );
  });

  await subscriber.subscribe(channel, (message) => {
    let parsed: { origin?: string; event?: ObservabilityEvent };
    try {
      parsed = JSON.parse(message) as { origin?: string; event?: ObservabilityEvent };
    } catch {
      return;
    }

    if (parsed.origin === instanceId || parsed.event === undefined) {
      return;
    }

    if (eventBus instanceof InMemoryObservabilityEventBus) {
      eventBus.ingestExternal(parsed.event);
    }
  });

  return {
    close: async () => {
      localUnsubscribe();
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
      await publisher.quit();
    },
  };
}

export async function createObservabilityEventBus(
  options: ObservabilityEventBusFactoryOptions = {},
): Promise<{
  readonly eventBus: ObservabilityEventBus;
  readonly redisFanout?: RedisObservabilityFanout;
}> {
  const eventBus = new InMemoryObservabilityEventBus({
    ...(options.maxEvents !== undefined ? { maxEvents: options.maxEvents } : {}),
  });

  if (options.redisUrl === undefined || options.redisUrl.length === 0) {
    return { eventBus };
  }

  const redisFanout = await attachRedisObservabilityFanout(eventBus, {
    redisUrl: options.redisUrl,
    ...(options.redisChannel !== undefined ? { channel: options.redisChannel } : {}),
  });

  return { eventBus, redisFanout };
}
