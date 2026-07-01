import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getSchemasRoot } from '@oacp/core';
import type { FastifyInstance } from 'fastify';

import type { ServerContext } from '../src/api/http/types.js';
import type { ObservabilityImportTrace } from '../src/observability/observability-persistence.js';
import { loadSummarizerIdentity } from './helpers.js';

export const DAY55_AGENT_COUNT = 100;
export const DAY55_TRACE_COUNT = 50;
export const DAY55_SYNC_TRACE_COUNT = 50;

export function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}

/** Deterministic UUID-shaped trace id for Day 55 fixtures. */
export function day55TraceId(index: number): string {
  const hex = index.toString(16).padStart(12, '0');
  return `d5500000-0000-4000-8000-${hex}`;
}

export function day55MessageId(traceIndex: number, messageIndex: number): string {
  const value = traceIndex * 10 + messageIndex;
  const hex = value.toString(16).padStart(12, '0');
  return `d5500001-0000-4000-8000-${hex}`;
}

export function buildDay55AgentIdentity(index: number) {
  const base = loadSummarizerIdentity();
  return {
    ...base,
    id: `agent://day55-agent-${index}`,
    name: `Day55 Agent ${index}`,
    capabilities: ['echo'],
    metadata: {
      fleet: index % 2 === 0 ? 'mcplab' : 'external',
      role: index % 5 === 0 ? 'planner' : 'worker',
    },
  };
}

export function buildDay55TraceExport(traceIndex: number): ObservabilityImportTrace {
  const traceId = day55TraceId(traceIndex);
  const agentA = buildDay55AgentIdentity(traceIndex % DAY55_AGENT_COUNT);
  const agentB = buildDay55AgentIdentity((traceIndex + 17) % DAY55_AGENT_COUNT);
  const taskExample = loadTaskRequestExample();
  const timestamp = `2026-06-30T12:${String(traceIndex % 60).padStart(2, '0')}:00.000Z`;

  return {
    trace_id: traceId,
    agents: [agentA, agentB],
    messages: [
      {
        ...taskExample,
        type: 'task_request',
        version: '1.0',
        message_id: day55MessageId(traceIndex, 1),
        trace_id: traceId,
        from: agentA.id,
        timestamp,
        capability: 'echo',
        input: { text: `day55 trace ${traceIndex}` },
      },
      {
        ...taskExample,
        type: 'task_response',
        version: '1.0',
        message_id: day55MessageId(traceIndex, 2),
        trace_id: traceId,
        from: agentB.id,
        in_reply_to: day55MessageId(traceIndex, 1),
        timestamp,
        status: 'success',
        output: { echo: `day55 trace ${traceIndex}` },
      },
    ],
    completed_at: timestamp,
    source: 'mcplab',
  };
}

export function buildDay55ExportBundle(traceCount: number = DAY55_SYNC_TRACE_COUNT) {
  return {
    ok: true,
    exports: Array.from({ length: traceCount }, (_, index) => buildDay55TraceExport(index)),
  };
}

export async function seedDay55AgentsAndTraces(
  app: FastifyInstance,
  options: {
    readonly agentCount?: number;
    readonly traceCount?: number;
  } = {},
): Promise<{ readonly agentIds: string[]; readonly traceIds: string[] }> {
  const agentCount = options.agentCount ?? DAY55_AGENT_COUNT;
  const traceCount = options.traceCount ?? DAY55_TRACE_COUNT;
  const taskExample = loadTaskRequestExample();
  const agentIds: string[] = [];

  for (let index = 0; index < agentCount; index += 1) {
    const identity = buildDay55AgentIdentity(index);
    agentIds.push(identity.id);
    const response = await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity },
    });
    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(`agent registration failed (${response.statusCode}): ${response.body}`);
    }
  }

  const traceIds: string[] = [];
  for (let traceIndex = 0; traceIndex < traceCount; traceIndex += 1) {
    const traceId = day55TraceId(traceIndex);
    traceIds.push(traceId);
    const from = agentIds[traceIndex % agentCount]!;
    const send = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        ...taskExample,
        message_id: day55MessageId(traceIndex, 1),
        trace_id: traceId,
        from,
        capability: 'echo',
        input: { text: `live trace ${traceIndex}` },
      },
    });
    if (send.statusCode !== 200) {
      throw new Error(`send-message failed (${send.statusCode}): ${send.body}`);
    }
  }

  return { agentIds, traceIds };
}

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(rank, sorted.length - 1))]!;
}

export async function measureSnapshotLatencyMs(
  app: FastifyInstance,
  options: {
    readonly path?: string;
    readonly samples?: number;
    readonly warmup?: number;
  } = {},
): Promise<{ readonly p50: number; readonly p95: number; readonly samples: number[] }> {
  const path = options.path ?? '/v1/observability/snapshot';
  const sampleCount = options.samples ?? 30;
  const warmup = options.warmup ?? 5;
  const durations: number[] = [];

  for (let index = 0; index < warmup + sampleCount; index += 1) {
    const started = performance.now();
    const response = await app.inject({
      method: 'GET',
      url: path,
      headers: { Accept: 'application/json' },
    });
    const elapsed = performance.now() - started;
    if (response.statusCode !== 200) {
      throw new Error(`snapshot failed (${response.statusCode}): ${response.body}`);
    }
    if (index >= warmup) {
      durations.push(elapsed);
    }
  }

  return {
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    samples: durations,
  };
}

export async function importDay55ExportBundle(
  app: FastifyInstance,
  traceCount: number = DAY55_SYNC_TRACE_COUNT,
): Promise<void> {
  const bundle = buildDay55ExportBundle(traceCount);
  for (const traceExport of bundle.exports) {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/observability/import',
      payload: traceExport,
    });
    if (response.statusCode !== 200) {
      throw new Error(`import failed (${response.statusCode}): ${response.body}`);
    }
  }
}

export type Day55App = {
  readonly app: FastifyInstance;
  readonly context: ServerContext;
};
