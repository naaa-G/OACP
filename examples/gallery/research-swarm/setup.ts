/**
 * Research swarm — gather → (keywords ∥ rank) → analyze → synthesize → publish (Day 25).
 */
import type {
  AgentRuntime,
  InMemoryMessageBus,
  OacpLogger,
  WorkflowDefinition,
  WorkflowEngine,
} from '@oacp/core';
import {
  PROTOCOL_VERSION,
  createAgentRuntime,
  createConsoleLogger,
  createDelegationGraphRecorder,
  createTaskMemoryRecorder,
} from '@oacp/core';
import type { ServerContext } from '@oacp/server';
import { DEFAULT_DEV_PUBLIC_KEY } from '@oacp/sdk';

import {
  type GalleryWorkerBundle,
  chainError,
  wireGallerySwarm,
} from '../shared/gallery-bootstrap.js';

export const RESEARCH_SWARM_WORKFLOW_ID = 'research-swarm-v1';

export const RESEARCH_SWARM_DEFAULT_INPUT = {
  topic: 'WebAssembly for edge compute',
} as const;

export const RESEARCH_SWARM_EXPECTED_OUTPUT = {
  topic: 'WebAssembly for edge compute',
  confidence: 'high',
  summary:
    'WebAssembly enables portable, sandboxed modules at the edge with near-native performance for latency-sensitive workloads.',
  key_findings: [
    'Wasm modules ship as compact binaries ideal for CDN edge nodes',
    'Cold-start latency beats container spin-up for small handlers',
    'Tooling (component model, WASI) is maturing for multi-language teams',
  ],
  sources: [
    'https://webassembly.org/docs/use-cases/',
    'https://bytecodealliance.org/articles/webassembly-on-the-edge',
  ],
} as const;

const PUBLIC_KEY = DEFAULT_DEV_PUBLIC_KEY;

export function createResearchSwarmWorkflow(): WorkflowDefinition {
  return {
    id: RESEARCH_SWARM_WORKFLOW_ID,
    name: 'Research Swarm',
    version: '1.0',
    description: 'Gather sources, extract signals in parallel, analyze, and publish a brief',
    steps: [
      {
        id: 'gather',
        capability: 'research.gather',
        mapInput: (ctx) => ({ topic: ctx.initialInput.topic }),
      },
      {
        id: 'keywords',
        capability: 'research.keywords',
        dependsOn: ['gather'],
        mapInput: (ctx) => ctx.getStepResult('gather')?.output ?? {},
      },
      {
        id: 'rank',
        capability: 'research.rank',
        dependsOn: ['gather'],
        mapInput: (ctx) => ctx.getStepResult('gather')?.output ?? {},
      },
      {
        id: 'analyze',
        capability: 'research.analyze',
        dependsOn: ['keywords', 'rank'],
        mapInput: (ctx) => ({
          topic: ctx.getStepResult('gather')?.output?.topic,
          keywords: ctx.getStepResult('keywords')?.output?.keywords,
          ranked_sources: ctx.getStepResult('rank')?.output?.ranked_sources,
        }),
      },
      {
        id: 'synthesize',
        capability: 'research.synthesize',
        dependsOn: ['analyze'],
        mapInput: (ctx) => ctx.getStepResult('analyze')?.output ?? {},
      },
      {
        id: 'publish',
        capability: 'research.publish',
        dependsOn: ['synthesize'],
        mapInput: (ctx) => ctx.getStepResult('synthesize')?.output ?? {},
      },
    ],
    reduceOutput: (ctx) => ctx.getStepResult('publish')?.output ?? {},
  };
}

export function registerResearchSwarmWorkflow(engine: WorkflowEngine): void {
  engine.register(createResearchSwarmWorkflow());
}

export function createResearchSwarmWorkers(
  bus: InMemoryMessageBus,
  options: {
    readonly taskRecorder: ReturnType<typeof createTaskMemoryRecorder>;
    readonly graphRecorder: ReturnType<typeof createDelegationGraphRecorder>;
    readonly logger?: OacpLogger;
  },
): GalleryWorkerBundle {
  const logger =
    options.logger ??
    createConsoleLogger({ level: 'info', json: process.env.OACP_LOG_JSON === '1' });

  const shared = {
    bus,
    taskRecorder: options.taskRecorder,
    delegationGraphRecorder: options.graphRecorder,
    logger,
  };

  const gatherer = createAgentRuntime({
    identity: {
      id: 'agent://research-gatherer',
      name: 'Research Gatherer',
      version: PROTOCOL_VERSION,
      capabilities: ['research.gather'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const topic = typeof task.input.topic === 'string' ? task.input.topic : undefined;
      if (!topic) {
        return chainError('Gatherer requires topic');
      }
      return {
        output: {
          topic,
          raw_sources: [
            'https://webassembly.org/docs/use-cases/',
            'https://bytecodealliance.org/articles/webassembly-on-the-edge',
            'https://developer.mozilla.org/en-US/docs/WebAssembly',
          ],
        },
      };
    },
  });

  const keywordAgent = createAgentRuntime({
    identity: {
      id: 'agent://research-keywords',
      name: 'Keyword Extractor',
      version: PROTOCOL_VERSION,
      capabilities: ['research.keywords'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const topic = typeof task.input.topic === 'string' ? task.input.topic : 'unknown';
      return {
        output: {
          topic,
          keywords: ['wasm', 'edge', 'latency', 'sandbox', 'portable'],
        },
      };
    },
  });

  const ranker = createAgentRuntime({
    identity: {
      id: 'agent://research-ranker',
      name: 'Source Ranker',
      version: PROTOCOL_VERSION,
      capabilities: ['research.rank'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const topic = typeof task.input.topic === 'string' ? task.input.topic : 'unknown';
      return {
        output: {
          topic,
          ranked_sources: [
            { url: 'https://webassembly.org/docs/use-cases/', score: 0.95 },
            { url: 'https://bytecodealliance.org/articles/webassembly-on-the-edge', score: 0.91 },
          ],
        },
      };
    },
  });

  const analyzer = createAgentRuntime({
    identity: {
      id: 'agent://research-analyzer',
      name: 'Research Analyzer',
      version: PROTOCOL_VERSION,
      capabilities: ['research.analyze'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const topic = typeof task.input.topic === 'string' ? task.input.topic : 'unknown';
      return {
        output: {
          topic,
          key_findings: RESEARCH_SWARM_EXPECTED_OUTPUT.key_findings,
          confidence: 'high',
        },
      };
    },
  });

  const synthesizer = createAgentRuntime({
    identity: {
      id: 'agent://research-synthesizer',
      name: 'Research Synthesizer',
      version: PROTOCOL_VERSION,
      capabilities: ['research.synthesize'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const topic = typeof task.input.topic === 'string' ? task.input.topic : 'unknown';
      const findings = Array.isArray(task.input.key_findings)
        ? task.input.key_findings.filter((v): v is string => typeof v === 'string')
        : [];
      return {
        output: {
          topic,
          key_findings: findings,
          confidence: task.input.confidence === 'high' ? 'high' : 'medium',
          summary: RESEARCH_SWARM_EXPECTED_OUTPUT.summary,
        },
      };
    },
  });

  const publisher = createAgentRuntime({
    identity: {
      id: 'agent://research-publisher',
      name: 'Research Publisher',
      version: PROTOCOL_VERSION,
      capabilities: ['research.publish'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const topic = typeof task.input.topic === 'string' ? task.input.topic : 'unknown';
      const summary = typeof task.input.summary === 'string' ? task.input.summary : undefined;
      const findings = Array.isArray(task.input.key_findings)
        ? task.input.key_findings.filter((v): v is string => typeof v === 'string')
        : [];
      const confidence = task.input.confidence === 'high' ? 'high' : 'medium';

      if (!summary) {
        return chainError('Publisher requires summary');
      }

      return {
        output: {
          topic,
          summary,
          key_findings: findings,
          confidence,
          sources: RESEARCH_SWARM_EXPECTED_OUTPUT.sources,
        },
      };
    },
  });

  const runtimes: readonly AgentRuntime[] = [
    gatherer,
    keywordAgent,
    ranker,
    analyzer,
    synthesizer,
    publisher,
  ];

  return {
    runtimes,
    startAll() {
      for (const runtime of runtimes) {
        runtime.start();
      }
    },
    stopAll() {
      for (const runtime of runtimes) {
        runtime.stop();
      }
    },
  };
}

export function bootstrapResearchSwarm(
  context: ServerContext,
  options: { readonly logger?: OacpLogger } = {},
): { stop(): void } {
  const workers = createResearchSwarmWorkers(context.bus, {
    taskRecorder: context.taskRecorder,
    graphRecorder: context.delegationGraphRecorder,
    ...(options.logger !== undefined ? { logger: options.logger } : {}),
  });
  return wireGallerySwarm(context, {
    workers,
    registerWorkflow: registerResearchSwarmWorkflow,
  });
}

export function researchOutputsMatch(
  actual: Record<string, unknown> | undefined,
  expected: typeof RESEARCH_SWARM_EXPECTED_OUTPUT,
): boolean {
  if (!actual) {
    return false;
  }
  return (
    actual.topic === expected.topic &&
    actual.confidence === expected.confidence &&
    actual.summary === expected.summary &&
    JSON.stringify(actual.key_findings) === JSON.stringify(expected.key_findings) &&
    JSON.stringify(actual.sources) === JSON.stringify(expected.sources)
  );
}
