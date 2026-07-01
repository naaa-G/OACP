import type { PlaygroundSnapshot } from '@oacp/observability-client';
import { describe, expect, it } from 'vitest';

import {
  computeSnapshotStableHash,
  resolveSnapshotPollIntervalMs,
  shouldPollSnapshotForTrace,
} from './snapshot-poll.js';

const completedTraceSnapshot = {
  trace_count: 1,
  server: {
    status: 'healthy' as const,
    protocol_version: '1.0',
    registered_agents: 1,
    bus_open: true,
  },
  agents: [],
  traces: [
    {
      traceId: 'trace-1',
      startedAt: '2026-06-30T10:00:00.000Z',
      lastActivityAt: '2026-06-30T10:05:00.000Z',
      messageCount: 9,
      messageTypes: ['task_request'],
      agents: ['agent://coordinator'],
      status: 'completed' as const,
    },
  ],
  agent_links: [],
} satisfies PlaygroundSnapshot;

describe('snapshot poll helpers', () => {
  it('disables polling for completed traces', () => {
    expect(
      shouldPollSnapshotForTrace(completedTraceSnapshot.traces[0], {
        snapshot: completedTraceSnapshot,
        selectedTraceId: 'trace-1',
      }),
    ).toBe(false);
    expect(
      resolveSnapshotPollIntervalMs({
        liveEnabled: true,
        reconcileIntervalMs: 30_000,
        selectedTraceId: 'trace-1',
        snapshot: completedTraceSnapshot,
      }),
    ).toBe(false);
  });

  it('infers completion from active_trace timeline when list row lacks status', () => {
    const { status: _ignoredStatus, ...traceWithoutStatus } = completedTraceSnapshot.traces[0]!;
    const snapshot = {
      ...completedTraceSnapshot,
      traces: [traceWithoutStatus],
      active_trace: {
        trace_id: 'trace-1',
        started_at: '2026-06-30T10:00:00.000Z',
        last_activity_at: '2026-06-30T10:05:00.000Z',
        message_count: 2,
        message_types: ['task_request', 'task_response'],
        agents: ['agent://coordinator'],
        timeline: [
          {
            index: 0,
            timestamp: '2026-06-30T10:00:00.000Z',
            type: 'task_request',
            from: 'agent://coordinator',
            to: 'agent://worker',
            message_id: 'm1',
            summary: 'task_request',
          },
          {
            index: 1,
            timestamp: '2026-06-30T10:05:00.000Z',
            type: 'task_response',
            from: 'agent://worker',
            status: 'success',
            message_id: 'm2',
            summary: 'task_response (success)',
          },
        ],
      },
    } satisfies PlaygroundSnapshot;

    expect(
      resolveSnapshotPollIntervalMs({
        liveEnabled: true,
        reconcileIntervalMs: 30_000,
        selectedTraceId: 'trace-1',
        snapshot,
      }),
    ).toBe(false);
  });

  it('keeps polling for running traces', () => {
    expect(
      resolveSnapshotPollIntervalMs({
        liveEnabled: true,
        reconcileIntervalMs: 30_000,
        selectedTraceId: 'trace-1',
        snapshot: {
          ...completedTraceSnapshot,
          traces: [{ ...completedTraceSnapshot.traces[0]!, status: 'running' }],
        },
      }),
    ).toBe(30_000);
  });

  it('avoids idle polling before trace auto-select', () => {
    expect(
      shouldPollSnapshotForTrace(undefined, {
        snapshot: completedTraceSnapshot,
      }),
    ).toBe(false);
  });

  it('does not arm polling before the first snapshot payload', () => {
    expect(
      resolveSnapshotPollIntervalMs({
        liveEnabled: true,
        reconcileIntervalMs: 30_000,
        selectedTraceId: 'trace-1',
        snapshot: undefined,
      }),
    ).toBe(false);
  });

  it('uses stable hash to ignore volatile last_seen_at churn', () => {
    const base = {
      ...completedTraceSnapshot,
      agents: [
        {
          id: 'agent://coordinator',
          name: 'Coordinator',
          version: '1',
          capabilities: ['plan'],
          publicKey: 'pk',
          status: 'active' as const,
          last_seen_at: '2026-06-30T10:00:00.000Z',
        },
      ],
    } satisfies PlaygroundSnapshot;

    const first = computeSnapshotStableHash(base);
    const second = computeSnapshotStableHash({
      ...base,
      agents: [{ ...base.agents[0]!, last_seen_at: '2026-06-30T12:00:00.000Z' }],
    });

    expect(first).toBe(second);
  });
});
