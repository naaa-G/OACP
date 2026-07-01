import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ObservabilityEvent } from '@oacp/observability-client';

import type { ServerContext } from '../api/http/types.js';

import { backfillTraceEventsAfterCursor } from './observability-event-backfill.js';
import {
  formatSseComment,
  formatSseEvent,
  type ObservabilityEventBus,
} from './observability-event-bus.js';

const SSE_HEARTBEAT_MS = 15_000;
const MAX_SSE_CONNECTIONS_PER_IP = 10;

interface EventsQuerystring {
  readonly trace_id?: string;
  readonly after?: string;
}

type ConnectionTracker = Map<string, number>;

function clientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }

  return request.ip;
}

function writeSse(reply: FastifyReply, chunk: string): void {
  reply.raw.write(chunk);
}

function publishResync(
  eventBus: ObservabilityEventBus,
  data: Extract<ObservabilityEvent, { type: 'stream.resync' }>['data'],
): ObservabilityEvent {
  return eventBus.publish({
    type: 'stream.resync',
    timestamp: new Date().toISOString(),
    data,
  });
}

export function registerObservabilityEventsRoute(
  app: FastifyInstance,
  context: ServerContext,
  options: {
    readonly connectionTracker?: ConnectionTracker;
    readonly maxConnectionsPerIp?: number;
  } = {},
): void {
  const tracker = options.connectionTracker ?? new Map<string, number>();
  const maxConnectionsPerIp = options.maxConnectionsPerIp ?? MAX_SSE_CONNECTIONS_PER_IP;

  app.get<{ Querystring: EventsQuerystring }>(
    '/v1/observability/events',
    async (request, reply) => {
      const traceId = request.query.trace_id?.trim();
      const afterQuery = request.query.after?.trim();
      const lastEventHeader = request.headers['last-event-id'];
      const afterEventId =
        (typeof lastEventHeader === 'string' && lastEventHeader.length > 0
          ? lastEventHeader
          : afterQuery) ?? undefined;

      const ip = clientIp(request);
      const activeForIp = tracker.get(ip) ?? 0;
      if (activeForIp >= maxConnectionsPerIp) {
        return reply.status(429).send({
          ok: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Maximum ${maxConnectionsPerIp} SSE connections per client`,
          },
        });
      }

      tracker.set(ip, activeForIp + 1);

      reply.hijack();
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      writeSse(reply, formatSseComment('connected'));

      const replayOptions = traceId !== undefined && traceId.length > 0 ? { traceId } : undefined;

      if (
        afterEventId !== undefined &&
        afterEventId.length > 0 &&
        !context.observabilityEventBus.hasEvent(afterEventId)
      ) {
        publishResync(context.observabilityEventBus, {
          reason: 'cursor_not_found',
          after_event_id: afterEventId,
          ...(traceId !== undefined ? { trace_id: traceId } : {}),
        });

        if (traceId !== undefined && traceId.length > 0) {
          const traceMessages = context.bus.getMessagesForTrace(traceId);
          for (const event of backfillTraceEventsAfterCursor(
            context.observabilityEventBus,
            traceMessages,
            afterEventId,
          )) {
            writeSse(reply, formatSseEvent(event));
          }
        }
      } else {
        for (const event of context.observabilityEventBus.replay(afterEventId, replayOptions)) {
          writeSse(reply, formatSseEvent(event));
        }
      }

      const unsubscribe = context.observabilityEventBus.subscribe((event) => {
        writeSse(reply, formatSseEvent(event));
      }, replayOptions);

      const heartbeat = setInterval(() => {
        writeSse(reply, formatSseComment(`heartbeat ${Date.now()}`));
      }, SSE_HEARTBEAT_MS);

      const cleanup = (): void => {
        clearInterval(heartbeat);
        unsubscribe();
        tracker.set(ip, Math.max(0, (tracker.get(ip) ?? 1) - 1));
      };

      request.raw.on('close', cleanup);
      request.raw.on('error', cleanup);
    },
  );
}
