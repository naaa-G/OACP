import { describe, expect, it } from 'vitest';

import {
  buildDelegation,
  buildDelegationGraphFromMemoryEntries,
  buildDelegationGraphFromMessages,
  buildTaskRequest,
  buildTaskResponse,
  createAgentRuntime,
  createDelegationGraphRecorder,
  createInMemoryDelegationGraphStore,
  createInMemoryMemoryStore,
  createMessageBus,
  createTaskMemoryRecorder,
  delegationTopologicalOrder,
  getDelegationAncestors,
  getDelegationDescendants,
} from '../src/index.js';

import { createCoordinatorIdentity } from './integration/helpers.js';

describe('delegation graph (Day 16)', () => {
  it('builds subtask chain from sendSubTask parent links', async () => {
    const bus = createMessageBus();
    const graphRecorder = createDelegationGraphRecorder();

    const workerC = createAgentRuntime({
      identity: {
        id: 'agent://c',
        name: 'C',
        version: '0.1',
        capabilities: ['work.c'],
        publicKey: createCoordinatorIdentity().publicKey,
      },
      bus,
      delegationGraphRecorder: graphRecorder,
      onTask: (task) => ({ output: { result: task.input.value } }),
    });

    const workerB = createAgentRuntime({
      identity: {
        id: 'agent://b',
        name: 'B',
        version: '0.1',
        capabilities: ['work.b'],
        publicKey: createCoordinatorIdentity().publicKey,
      },
      bus,
      delegationGraphRecorder: graphRecorder,
      onTask: async (_task, ctx) => {
        const sub = await ctx.sendSubTask({
          capability: 'work.c',
          input: { value: 'nested' },
        });
        if (!sub.ok || !sub.response) {
          throw new Error('subtask failed');
        }
        return { output: sub.response.output ?? {} };
      },
    });

    const workerA = createAgentRuntime({
      identity: {
        id: 'agent://a',
        name: 'A',
        version: '0.1',
        capabilities: ['work.a'],
        publicKey: createCoordinatorIdentity().publicKey,
      },
      bus,
      delegationGraphRecorder: graphRecorder,
      onTask: async (_task, ctx) => {
        const sub = await ctx.sendSubTask({
          capability: 'work.b',
          input: { value: 'chain' },
        });
        if (!sub.ok || !sub.response) {
          throw new Error('subtask failed');
        }
        return { output: sub.response.output ?? {} };
      },
    });

    const coordinator = createAgentRuntime({
      identity: createCoordinatorIdentity(),
      bus,
      delegationGraphRecorder: graphRecorder,
    });

    workerC.start();
    workerB.start();
    workerA.start();
    coordinator.start();

    const outcome = await coordinator.sendTask({
      capability: 'work.a',
      input: { value: 'root' },
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    const graph = await graphRecorder.getGraph(outcome.request.trace_id);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }
    expect(graph.roots).toContain(outcome.request.message_id);
    expect(graph.depth).toBeGreaterThanOrEqual(3);

    const subtaskEdges = graph.edges.filter((edge) => edge.kind === 'subtask');
    expect(subtaskEdges.length).toBeGreaterThanOrEqual(2);

    const order = delegationTopologicalOrder(graph);
    expect(order[0]).toBe(outcome.request.message_id);

    workerC.stop();
    workerB.stop();
    workerA.stop();
    coordinator.stop();
  });

  it('builds explicit delegation edges with parent_message_id', async () => {
    const store = createInMemoryDelegationGraphStore();

    const root = buildTaskRequest({
      from: 'agent://lead',
      capability: 'orchestrate',
      input: { goal: 'analyze' },
      traceId: 'trace-delegate',
    });

    const delegation = buildDelegation({
      from: 'agent://lead',
      parentMessageId: root.message_id,
      capability: 'analyze.text',
      input: { text: 'sample' },
      traceId: root.trace_id,
      to: 'agent://analyst',
    });

    const response = buildTaskResponse({
      from: 'agent://analyst',
      inReplyTo: delegation.message_id,
      traceId: root.trace_id,
      status: 'success',
      output: { summary: 'done' },
    });

    await store.recordMessage(root);
    await store.recordMessage(delegation);
    await store.recordMessage(response);

    const graph = await store.getGraph(root.trace_id);
    expect(graph?.edges.some((edge) => edge.kind === 'delegates')).toBe(true);
    expect(graph?.edges.some((edge) => edge.kind === 'responds_to')).toBe(true);

    const descendants = await store.getDescendants(root.trace_id, root.message_id);
    expect(descendants.some((node) => node.kind === 'delegation')).toBe(true);

    const ancestors = await store.getAncestors(root.trace_id, delegation.message_id);
    expect(ancestors[0]?.message_id).toBe(root.message_id);
  });

  it('reconstructs graph from memory entries', async () => {
    const memoryStore = createInMemoryMemoryStore();
    const taskRecorder = createTaskMemoryRecorder(memoryStore);

    const root = buildTaskRequest({
      from: 'agent://lead',
      capability: 'orchestrate',
      input: { goal: 'run' },
      traceId: 'trace-memory',
    });

    await taskRecorder.recordTaskRequest(root);

    const child = buildTaskRequest({
      from: 'agent://lead',
      capability: 'work.child',
      input: { step: 1 },
      traceId: root.trace_id,
    });

    await taskRecorder.recordTaskRequest(child, undefined, {
      parentMessageId: root.message_id,
    });

    const entries = await memoryStore.query({ trace_id: root.trace_id });
    const graph = buildDelegationGraphFromMemoryEntries(entries);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.edges.filter((edge) => edge.kind === 'subtask')).toHaveLength(1);
    expect(getDelegationAncestors(graph, child.message_id)[0]?.message_id).toBe(root.message_id);
  });

  it('builds graph from trace messages in delivery order', () => {
    const root = buildTaskRequest({
      from: 'agent://lead',
      capability: 'orchestrate',
      input: {},
      traceId: 'trace-msgs',
    });

    const delegation = buildDelegation({
      from: 'agent://lead',
      parentMessageId: root.message_id,
      capability: 'work.child',
      input: {},
      traceId: root.trace_id,
    });

    const graph = buildDelegationGraphFromMessages([root, delegation]);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }
    expect(graph.nodes).toHaveLength(2);
    expect(graph.roots).toEqual([root.message_id]);
    expect(getDelegationDescendants(graph, root.message_id)).toHaveLength(1);
  });
});
