import {
  PROTOCOL_VERSION,
  createAgentRuntime,
  type AgentRuntime,
  type TaskHandler,
} from '@oacp/core';

import type { ServerContext } from '../api/http/types.js';

/** Dev-only in-process workers + workflow definitions for HTTP workflow demos. */
export interface DevWorkflowBootstrap {
  stop(): void;
}

const PUBLIC_KEY = {
  kty: 'EC',
  crv: 'P-256',
  x: 'WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWlibY',
  y: 'ALOpExF7nDwyk9V4ToWo3L5v_6Y1sQJCrcn_6OlOWf5',
  use: 'sig' as const,
  alg: 'ES256',
  kid: 'oacp-dev-workflows',
};

function registerWorker(
  context: ServerContext,
  params: {
    readonly id: string;
    readonly name: string;
    readonly capabilities: readonly string[];
    readonly onTask: TaskHandler;
  },
): AgentRuntime {
  const runtime = createAgentRuntime({
    identity: {
      id: params.id,
      name: params.name,
      version: PROTOCOL_VERSION,
      capabilities: [...params.capabilities],
      publicKey: PUBLIC_KEY,
    },
    bus: context.bus,
    taskRecorder: context.taskRecorder,
    delegationGraphRecorder: context.delegationGraphRecorder,
    onTask: params.onTask,
  });

  context.registry.register(runtime.identity, { replace: true });
  context.bus.register(runtime.identity.id, undefined, {
    capabilities: runtime.identity.capabilities,
    useMailbox: true,
  });
  runtime.start();
  return runtime;
}

/** Register echo + document DAG workers and workflow definitions on the server bus. */
export function bootstrapDevWorkflows(context: ServerContext): DevWorkflowBootstrap {
  const workers: AgentRuntime[] = [];

  workers.push(
    registerWorker(context, {
      id: 'agent://echo-worker',
      name: 'Echo Worker',
      capabilities: ['work.echo'],
      onTask: (task) => ({
        output: { value: task.input.value },
      }),
    }),
    registerWorker(context, {
      id: 'agent://tokenizer',
      name: 'Tokenizer',
      capabilities: ['text.tokenize'],
      onTask: (task) => {
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { tokens: text.split(/\s+/).filter(Boolean) } };
      },
    }),
    registerWorker(context, {
      id: 'agent://analyzer',
      name: 'Analyzer',
      capabilities: ['analyze.text'],
      onTask: (task) => {
        const tokens = Array.isArray(task.input.tokens) ? task.input.tokens : [];
        return { output: { analysis: tokens.join(' / ') } };
      },
    }),
    registerWorker(context, {
      id: 'agent://summarizer',
      name: 'Summarizer',
      capabilities: ['text.summarize'],
      onTask: (task) => {
        const text = typeof task.input.text === 'string' ? task.input.text : '';
        return { output: { summary: `Report: ${text}` } };
      },
    }),
  );

  context.workflowEngine.register({
    id: 'echo-workflow',
    name: 'Echo Workflow',
    steps: [
      {
        id: 'echo',
        capability: 'work.echo',
        input: { value: 'from-http' },
      },
    ],
  });

  context.workflowEngine.register({
    id: 'document-dag',
    name: 'Document Processing DAG',
    version: '1.0',
    steps: [
      {
        id: 'tokenize',
        capability: 'text.tokenize',
        input: { text: 'enterprise workflow engine demo' },
      },
      {
        id: 'analyze',
        capability: 'analyze.text',
        dependsOn: ['tokenize'],
        mapInput: (ctx) => ({
          tokens: ctx.getStepResult('tokenize')?.output?.tokens ?? [],
        }),
      },
      {
        id: 'summarize',
        capability: 'text.summarize',
        dependsOn: ['analyze'],
        mapInput: (ctx) => {
          const analysis = ctx.getStepResult('analyze')?.output?.analysis;
          return { text: typeof analysis === 'string' ? analysis : '' };
        },
      },
    ],
    reduceOutput: (ctx) => ({
      summary: ctx.getStepResult('summarize')?.output?.summary,
      steps: ctx.stepResults.size,
    }),
  });

  return {
    stop(): void {
      for (const worker of workers) {
        worker.stop();
      }
    },
  };
}

export function isDevWorkflowsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.OACP_DEV_WORKFLOWS?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}
