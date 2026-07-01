import { describe, expect, it } from 'vitest';

import {
  InMemoryObservabilityEventBus,
  formatSseEvent,
} from '../src/observability/observability-event-bus.js';
import {
  isRootTraceCompletion,
  publishMessageObservabilityEvents,
} from '../src/observability/observability-event-emitter.js';

describe('InMemoryObservabilityEventBus', () => {
  it('assigns monotonic ids and replays after cursor', () => {
    const bus = new InMemoryObservabilityEventBus();

    const first = bus.publish({
      type: 'agent.registered',
      timestamp: '2026-06-20T12:00:00.000Z',
      data: {
        agent_id: 'agent://worker',
        name: 'Worker',
        capabilities: ['echo'],
      },
    });
    bus.publish({
      type: 'agent.registered',
      timestamp: '2026-06-20T12:00:01.000Z',
      data: {
        agent_id: 'agent://planner',
        name: 'Planner',
        capabilities: ['plan'],
      },
    });

    expect(first.id).toBe('1');
    expect(bus.replay(first.id)).toHaveLength(1);
    expect(bus.replay(undefined)).toHaveLength(2);
  });

  it('records events in the replay buffer without notifying live subscribers', () => {
    const bus = new InMemoryObservabilityEventBus();
    const live: string[] = [];
    bus.subscribe((event) => {
      live.push(event.type);
    });

    bus.record({
      type: 'agent.registered',
      timestamp: '2026-06-20T12:00:00.000Z',
      data: {
        agent_id: 'agent://worker',
        name: 'Worker',
        capabilities: ['echo'],
      },
    });

    expect(live).toHaveLength(0);
    expect(bus.replay(undefined)).toHaveLength(1);
  });

  it('filters replay and subscriptions by trace_id', () => {
    const bus = new InMemoryObservabilityEventBus();
    bus.publish({
      type: 'message.appended',
      timestamp: '2026-06-20T12:00:00.000Z',
      data: {
        trace_id: 'trace-a',
        message_id: 'msg-a',
        message_type: 'task_request',
        from: 'agent://a',
        timestamp: '2026-06-20T12:00:00.000Z',
      },
    });
    bus.publish({
      type: 'message.appended',
      timestamp: '2026-06-20T12:00:01.000Z',
      data: {
        trace_id: 'trace-b',
        message_id: 'msg-b',
        message_type: 'task_request',
        from: 'agent://b',
        timestamp: '2026-06-20T12:00:01.000Z',
      },
    });

    expect(bus.replay(undefined, { traceId: 'trace-a' })).toHaveLength(1);
  });

  it('formats SSE frames with id, event, and data envelope', () => {
    const frame = formatSseEvent({
      id: '7',
      type: 'trace.started',
      timestamp: '2026-06-20T12:00:00.000Z',
      data: {
        trace_id: 'trace-1',
        started_at: '2026-06-20T12:00:00.000Z',
        root_message_id: 'msg-1',
        from: 'agent://coordinator',
      },
    });

    expect(frame).toContain('id: 7');
    expect(frame).toContain('event: trace.started');
    expect(frame).toContain('"trace_id":"trace-1"');
  });
});

describe('publishMessageObservabilityEvents', () => {
  it('emits trace.started, message.appended, and root trace.completed', () => {
    const bus = new InMemoryObservabilityEventBus();
    const rootMessage = {
      type: 'task_request' as const,
      version: '1.0',
      message_id: 'root-msg',
      trace_id: 'trace-1',
      from: 'agent://coordinator',
      timestamp: '2026-06-20T12:00:00.000Z',
      capability: 'echo',
      input: { text: 'hello' },
    };
    const responseMessage = {
      type: 'task_response' as const,
      version: '1.0',
      message_id: 'resp-msg',
      trace_id: 'trace-1',
      from: 'agent://worker',
      timestamp: '2026-06-20T12:00:02.000Z',
      in_reply_to: 'root-msg',
      status: 'success' as const,
      output: { echo: 'hello' },
    };

    publishMessageObservabilityEvents(bus, rootMessage, {
      recipients: ['agent://worker'],
      isNewTrace: true,
      traceMessageCount: 1,
      rootMessageId: rootMessage.message_id,
    });
    publishMessageObservabilityEvents(bus, responseMessage, {
      isNewTrace: false,
      traceMessageCount: 2,
      rootMessageId: rootMessage.message_id,
    });

    const events = bus.replay(undefined, { traceId: 'trace-1' });
    expect(events.map((event) => event.type)).toEqual([
      'trace.started',
      'message.appended',
      'message.appended',
      'trace.completed',
    ]);
    expect(isRootTraceCompletion(responseMessage, rootMessage.message_id)).toBe(true);
  });
});
