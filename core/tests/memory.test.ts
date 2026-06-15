import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_MEMORY_SCOPE,
  InMemoryMemoryStore,
  MemoryScopeManager,
  TaskMemoryRecorder,
  createTaskMemoryRecorder,
  buildTaskRequest,
  buildTaskResponse,
  createAgentRuntime,
  createMessageBus,
} from '../src/index.js';

import { createCoordinatorIdentity } from './integration/helpers.js';

describe('memory system (Day 15)', () => {
  afterEach(() => {
    // no global cache to reset
  });

  it('MemoryScopeManager normalizes and validates scopes', () => {
    const manager = new MemoryScopeManager();
    expect(manager.normalizeScope('Workflow.Default')).toBe('workflow.default');
    expect(manager.traceScope('abc-123')).toBe('workflow.trace.abc-123');
    expect(() => manager.normalizeScope('INVALID SCOPE')).toThrow();
  });

  it('InMemoryMemoryStore appends and queries by trace_id', async () => {
    const store = new InMemoryMemoryStore();
    await store.append({
      scope: DEFAULT_MEMORY_SCOPE,
      trace_id: 'trace-1',
      agent_id: 'agent://a',
      kind: 'task_request',
      capability: 'text.summarize',
      payload: { input: { text: 'hello' } },
    });
    await store.append({
      scope: DEFAULT_MEMORY_SCOPE,
      trace_id: 'trace-1',
      agent_id: 'agent://b',
      kind: 'output',
      status: 'success',
      payload: { output: { summary: 'HELLO' } },
    });

    const entries = await store.query({ trace_id: 'trace-1' });
    expect(entries).toHaveLength(2);
    expect(entries[0]?.kind).toBe('task_request');
    expect(entries[1]?.kind).toBe('output');

    const scopes = await store.listScopes();
    expect(scopes).toContain(DEFAULT_MEMORY_SCOPE);

    await store.close();
  });

  it('TaskMemoryRecorder records task_request and task_response', async () => {
    const store = new InMemoryMemoryStore();
    const recorder = createTaskMemoryRecorder(store);

    const request = buildTaskRequest({
      from: 'agent://coordinator',
      capability: 'text.summarize',
      input: { text: 'persist me' },
      traceId: 'trace-persist',
    });

    await recorder.recordTaskRequest(request);

    const response = buildTaskResponse({
      from: 'agent://worker',
      inReplyTo: request.message_id,
      traceId: request.trace_id,
      status: 'success',
      output: { summary: 'done' },
    });

    await recorder.recordTaskResponse(response);

    const history = await store.query({ trace_id: 'trace-persist' });
    expect(history).toHaveLength(2);
    expect(history.some((e) => e.kind === 'task_request')).toBe(true);
    expect(history.some((e) => e.kind === 'output')).toBe(true);
  });

  it('AgentRuntime persists task history when taskRecorder is configured', async () => {
    const bus = createMessageBus();
    const store = new InMemoryMemoryStore();
    const recorder = new TaskMemoryRecorder(store);

    const worker = createAgentRuntime({
      identity: {
        id: 'agent://worker',
        name: 'Worker',
        version: '0.1',
        capabilities: ['echo'],
        publicKey: createCoordinatorIdentity().publicKey,
      },
      bus,
      taskRecorder: recorder,
      onTask: (task) => ({ output: { echo: task.input.text } }),
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
      taskRecorder: recorder,
    });

    worker.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'echo',
      input: { text: 'memory-test' },
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    const history = await store.query({ trace_id: outcome.request.trace_id });
    expect(history.length).toBeGreaterThanOrEqual(2);

    worker.stop();
    coordinator.stop();
  });
});
