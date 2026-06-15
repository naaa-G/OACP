import type { WorkflowRunRecord } from './workflow-definition-types.js';

/** Store for workflow run history and status queries. */
export interface WorkflowRunStore {
  save(record: WorkflowRunRecord): Promise<void>;
  get(runId: string): Promise<WorkflowRunRecord | undefined>;
  listByWorkflow(workflowId: string): Promise<readonly WorkflowRunRecord[]>;
  listRecent(limit?: number): Promise<readonly WorkflowRunRecord[]>;
}

/** In-memory workflow run store for single-node deployments and tests. */
export class InMemoryWorkflowRunStore implements WorkflowRunStore {
  private readonly runs = new Map<string, WorkflowRunRecord>();

  save(record: WorkflowRunRecord): Promise<void> {
    this.runs.set(record.runId, record);
    return Promise.resolve();
  }

  get(runId: string): Promise<WorkflowRunRecord | undefined> {
    return Promise.resolve(this.runs.get(runId));
  }

  listByWorkflow(workflowId: string): Promise<readonly WorkflowRunRecord[]> {
    const records = [...this.runs.values()].filter((run) => run.workflowId === workflowId);
    return Promise.resolve(records);
  }

  listRecent(limit = 50): Promise<readonly WorkflowRunRecord[]> {
    const records = [...this.runs.values()]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
    return Promise.resolve(records);
  }

  clear(): Promise<void> {
    this.runs.clear();
    return Promise.resolve();
  }
}

export function createInMemoryWorkflowRunStore(): InMemoryWorkflowRunStore {
  return new InMemoryWorkflowRunStore();
}
