import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createSqliteMemoryStore } from '../src/storage/sqlite-memory-store.js';
import { DEFAULT_MEMORY_SCOPE } from '@oacp/core';

describe('SqliteMemoryStore (Day 15)', () => {
  let store = createSqliteMemoryStore({ path: ':memory:' });

  afterEach(async () => {
    await store.close();
    store = createSqliteMemoryStore({ path: ':memory:' });
  });

  it('persists and queries task history', async () => {
    const entry = await store.append({
      scope: DEFAULT_MEMORY_SCOPE,
      trace_id: 'trace-sqlite',
      agent_id: 'agent://worker',
      kind: 'decision',
      payload: { decision: 'escalate to on-call' },
      metadata: { severity: 'high' },
    });

    expect(entry.id.length).toBeGreaterThan(0);

    const fetched = await store.get(entry.id);
    expect(fetched?.payload).toEqual({ decision: 'escalate to on-call' });

    const byTrace = await store.query({ trace_id: 'trace-sqlite' });
    expect(byTrace).toHaveLength(1);

    const scopes = await store.listScopes();
    expect(scopes).toContain(DEFAULT_MEMORY_SCOPE);
  });

  it('filters by kind and agent_id', async () => {
    await store.append({
      scope: 'workflow.trace.t1',
      trace_id: 't1',
      agent_id: 'agent://a',
      kind: 'task_request',
      capability: 'analyze',
      payload: { input: {} },
    });
    await store.append({
      scope: 'workflow.trace.t1',
      trace_id: 't1',
      agent_id: 'agent://b',
      kind: 'output',
      status: 'success',
      payload: { output: { ok: true } },
    });

    const outputs = await store.query({ trace_id: 't1', kind: 'output' });
    expect(outputs).toHaveLength(1);
    expect(outputs[0]?.agent_id).toBe('agent://b');
  });

  it('creates parent directories for nested file paths', async () => {
    const base = mkdtempSync(join(tmpdir(), 'oacp-sqlite-'));
    const dbPath = join(base, 'nested', 'memory.db');

    const fileStore = createSqliteMemoryStore({ path: dbPath });
    try {
      expect(fileStore.path).toBe(dbPath);
      await fileStore.append({
        scope: DEFAULT_MEMORY_SCOPE,
        trace_id: 'trace-nested',
        agent_id: 'agent://worker',
        kind: 'decision',
        payload: { decision: 'ok' },
      });
      const entries = await fileStore.query({ trace_id: 'trace-nested' });
      expect(entries).toHaveLength(1);
    } finally {
      await fileStore.close();
      rmSync(base, { recursive: true, force: true });
    }
  });
});
