import type { AgentRuntime, WorkflowEngine } from '@oacp/core';
import type { ServerContext } from '@oacp/server';

export interface GalleryWorkerBundle {
  readonly runtimes: readonly AgentRuntime[];
  startAll(): void;
  stopAll(): void;
}

export function chainError(message: string): {
  status: 'error';
  error: { code: string; message: string };
} {
  return { status: 'error', error: { code: 'CHAIN_FAILED', message } };
}

/** Register workers on registry + bus and start runtimes (startup-team pattern). */
export function wireGallerySwarm(
  context: ServerContext,
  options: {
    readonly workers: GalleryWorkerBundle;
    readonly registerWorkflow: (engine: WorkflowEngine) => void;
  },
): { stop(): void } {
  options.registerWorkflow(context.workflowEngine);

  for (const runtime of options.workers.runtimes) {
    context.registry.register(runtime.identity, { replace: true });
    context.bus.register(runtime.identity.id, undefined, {
      capabilities: runtime.identity.capabilities,
      useMailbox: true,
    });
    runtime.start();
  }

  return {
    stop(): void {
      options.workers.stopAll();
    },
  };
}
