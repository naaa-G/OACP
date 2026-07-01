/**
 * Shared setup for Demo v2 — structured incident-response DAG (Day 21).
 * Integrates Week 3: memory, delegation graph, DAG workflow, recovery, observability.
 */
import type {
  AgentIdentity,
  AgentRuntime,
  InMemoryMessageBus,
  OacpLogger,
  WorkflowDefinition,
  WorkflowEngine,
} from '@oacp/core';
import {
  DEFAULT_TASK_RECOVERY_POLICY,
  PROTOCOL_VERSION,
  createAgentRuntime,
  createConsoleLogger,
  createDelegationGraphRecorder,
  createTaskMemoryRecorder,
} from '@oacp/core';
import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '@oacp/server';
import { DEFAULT_DEV_PUBLIC_KEY } from '@oacp/sdk';

/** Default demo input — structured incident document. */
export const DEMO_V2_INPUT = {
  document: '  INC-2048: payment API latency spike affecting checkout  ',
} as const;

/** Expected structured output for smoke tests and `--verify`. */
export const DEMO_V2_EXPECTED_OUTPUT = {
  incident_id: 'INC-2048',
  severity: 'high',
  summary: 'Payment API latency spike affecting checkout',
  entities: ['payment API', 'checkout'],
  action_items: ['Scale payment API replicas', 'Enable checkout fallback mode'],
  report: 'INC-2048 — Payment API latency spike affecting checkout (severity: high)',
  recovery_used: false,
} as const;

export const DEMO_V2_WORKFLOW_ID = 'incident-response-v2';

/** Primary classifier URI — numeric prefix ensures first in capability routing (Day 11/19). */
export const CLASSIFIER_PRIMARY_ID = 'agent://classifier-01-primary';
/** Backup classifier URI — tried after primary via recovery failover. */
export const CLASSIFIER_BACKUP_ID = 'agent://classifier-02-backup';

const PUBLIC_KEY = DEFAULT_DEV_PUBLIC_KEY;

export interface DemoV2WorkerBundle {
  readonly runtimes: readonly AgentRuntime[];
  readonly graphRecorder: ReturnType<typeof createDelegationGraphRecorder>;
  startAll(): void;
  stopAll(): void;
}

function chainError(message: string): {
  status: 'error';
  error: { code: string; message: string };
} {
  return { status: 'error', error: { code: 'CHAIN_FAILED', message } };
}

function parseIncidentId(document: string): string | undefined {
  const match = /INC-\d+/i.exec(document);
  return match?.[0]?.toUpperCase();
}

function inferSeverity(document: string): 'high' | 'medium' | 'low' {
  const lower = document.toLowerCase();
  if (lower.includes('latency') || lower.includes('spike') || lower.includes('outage')) {
    return 'high';
  }
  if (lower.includes('degraded') || lower.includes('slow')) {
    return 'medium';
  }
  return 'low';
}

function summarizeDocument(document: string, incidentId: string): string {
  const withoutId = document
    .replace(new RegExp(incidentId, 'i'), '')
    .replace(/^[\s:]+/, '')
    .trim();
  if (withoutId.length === 0) {
    return 'No additional details';
  }
  const normalized = withoutId.charAt(0).toUpperCase() + withoutId.slice(1);
  return normalized.endsWith('.') ? normalized.slice(0, -1) : normalized;
}

function extractEntities(document: string): readonly string[] {
  const lower = document.toLowerCase();
  const entities = new Set<string>();
  if (lower.includes('payment')) {
    entities.add('payment API');
  }
  if (lower.includes('checkout')) {
    entities.add('checkout');
  }
  if (entities.size === 0) {
    entities.add('unknown service');
  }
  return [...entities];
}

function shouldPrimaryClassifierFail(): boolean {
  const value = process.env.OACP_DEMO_V2_SIMULATE_FAILURE?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

/** Incident-response DAG workflow definition (parallel classify + enrich). */
export function createIncidentResponseWorkflow(): WorkflowDefinition {
  return {
    id: DEMO_V2_WORKFLOW_ID,
    name: 'Incident Response v2',
    version: '2.0',
    description: 'Structured task chain with parallel enrichment and resilient classification',
    steps: [
      {
        id: 'intake',
        capability: 'incident.intake',
        mapInput: (ctx) => ({
          document: typeof ctx.initialInput.document === 'string' ? ctx.initialInput.document : '',
        }),
      },
      {
        id: 'classify',
        capability: 'incident.classify',
        dependsOn: ['intake'],
        recovery: DEFAULT_TASK_RECOVERY_POLICY,
        mapInput: (ctx) => {
          const intake = ctx.getStepResult('intake')?.output;
          return {
            incident_id: intake?.incident_id,
            document: intake?.normalized_document,
          };
        },
      },
      {
        id: 'enrich',
        capability: 'incident.enrich',
        dependsOn: ['intake'],
        mapInput: (ctx) => {
          const intake = ctx.getStepResult('intake')?.output;
          return {
            incident_id: intake?.incident_id,
            document: intake?.normalized_document,
          };
        },
      },
      {
        id: 'synthesize',
        capability: 'incident.synthesize',
        dependsOn: ['classify', 'enrich'],
        mapInput: (ctx) => ({
          incident_id: ctx.getStepResult('intake')?.output?.incident_id,
          severity: ctx.getStepResult('classify')?.output?.severity,
          entities: ctx.getStepResult('enrich')?.output?.entities,
          document: ctx.getStepResult('intake')?.output?.normalized_document,
        }),
      },
      {
        id: 'publish',
        capability: 'incident.publish',
        dependsOn: ['synthesize'],
        mapInput: (ctx) => ctx.getStepResult('synthesize')?.output ?? {},
      },
    ],
    reduceOutput: (ctx) => {
      const published = ctx.getStepResult('publish')?.output;
      const classifyStep = ctx.getStepResult('classify');
      const recoveryUsed = (classifyStep?.recoveryAttempts?.length ?? 0) > 1;

      return {
        ...(published ?? {}),
        recovery_used: recoveryUsed,
      };
    },
  };
}

export function registerIncidentResponseWorkflow(engine: WorkflowEngine): void {
  engine.register(createIncidentResponseWorkflow());
}

/** Create Demo v2 worker runtimes with memory, graph, and structured logging. */
export function createDemoV2Workers(
  bus: InMemoryMessageBus,
  options: {
    readonly taskRecorder: ReturnType<typeof createTaskMemoryRecorder>;
    readonly graphRecorder: ReturnType<typeof createDelegationGraphRecorder>;
    readonly logger?: OacpLogger;
  },
): DemoV2WorkerBundle {
  const logger =
    options.logger ??
    createConsoleLogger({ level: 'info', json: process.env.OACP_LOG_JSON === '1' });

  const shared = {
    bus,
    taskRecorder: options.taskRecorder,
    delegationGraphRecorder: options.graphRecorder,
    logger,
  };

  const intake = createAgentRuntime({
    identity: {
      id: 'agent://intake',
      name: 'Incident Intake',
      version: PROTOCOL_VERSION,
      capabilities: ['incident.intake'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const document = typeof task.input.document === 'string' ? task.input.document : '';
      const normalized = document.trim();
      const incidentId = parseIncidentId(normalized);
      if (!incidentId) {
        return chainError('Intake could not parse incident id');
      }
      return {
        output: { incident_id: incidentId, normalized_document: normalized },
      };
    },
  });

  const classifierPrimary = createAgentRuntime({
    identity: {
      id: CLASSIFIER_PRIMARY_ID,
      name: 'Classifier Primary',
      version: PROTOCOL_VERSION,
      capabilities: ['incident.classify'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      if (shouldPrimaryClassifierFail()) {
        return {
          status: 'error',
          error: { code: 'CLASSIFIER_DOWN', message: 'Primary tier unavailable' },
        };
      }
      const document = typeof task.input.document === 'string' ? task.input.document : '';
      return { output: { severity: inferSeverity(document), tier: 'primary' } };
    },
  });

  const classifierBackup = createAgentRuntime({
    identity: {
      id: CLASSIFIER_BACKUP_ID,
      name: 'Classifier Backup',
      version: PROTOCOL_VERSION,
      capabilities: ['incident.classify'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const document = typeof task.input.document === 'string' ? task.input.document : '';
      return { output: { severity: inferSeverity(document), tier: 'backup' } };
    },
  });

  const enricher = createAgentRuntime({
    identity: {
      id: 'agent://enricher',
      name: 'Incident Enricher',
      version: PROTOCOL_VERSION,
      capabilities: ['incident.enrich'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const document = typeof task.input.document === 'string' ? task.input.document : '';
      return {
        output: {
          entities: extractEntities(document),
          tags: ['latency', 'customer-impact'],
        },
      };
    },
  });

  const synthesizer = createAgentRuntime({
    identity: {
      id: 'agent://synthesizer',
      name: 'Incident Synthesizer',
      version: PROTOCOL_VERSION,
      capabilities: ['incident.synthesize'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const incidentId =
        typeof task.input.incident_id === 'string' ? task.input.incident_id : undefined;
      const document = typeof task.input.document === 'string' ? task.input.document : '';
      const severity =
        task.input.severity === 'high' ||
        task.input.severity === 'medium' ||
        task.input.severity === 'low'
          ? task.input.severity
          : undefined;
      const entities = Array.isArray(task.input.entities)
        ? task.input.entities.filter((value): value is string => typeof value === 'string')
        : [];

      if (!incidentId || !severity) {
        return chainError('Synthesizer requires incident_id and severity');
      }

      const summary = summarizeDocument(document, incidentId);
      const actionItems =
        severity === 'high'
          ? ['Scale payment API replicas', 'Enable checkout fallback mode']
          : ['Monitor metrics', 'Schedule post-incident review'];

      return {
        output: {
          incident_id: incidentId,
          severity,
          summary,
          entities,
          action_items: actionItems,
        },
      };
    },
  });

  const publisher = createAgentRuntime({
    identity: {
      id: 'agent://publisher',
      name: 'Incident Publisher',
      version: PROTOCOL_VERSION,
      capabilities: ['incident.publish'],
      publicKey: PUBLIC_KEY,
    },
    ...shared,
    onTask: (task) => {
      const incidentId =
        typeof task.input.incident_id === 'string' ? task.input.incident_id : undefined;
      const summary = typeof task.input.summary === 'string' ? task.input.summary : undefined;
      const severity =
        task.input.severity === 'high' ||
        task.input.severity === 'medium' ||
        task.input.severity === 'low'
          ? task.input.severity
          : undefined;
      const entities = Array.isArray(task.input.entities)
        ? task.input.entities.filter((value): value is string => typeof value === 'string')
        : [];
      const actionItems = Array.isArray(task.input.action_items)
        ? task.input.action_items.filter((value): value is string => typeof value === 'string')
        : [];

      if (!incidentId || !summary || !severity) {
        return chainError('Publisher requires incident_id, summary, and severity');
      }

      return {
        output: {
          incident_id: incidentId,
          severity,
          summary,
          entities,
          action_items: actionItems,
          report: `${incidentId} — ${summary} (severity: ${severity})`,
        },
      };
    },
  });

  const runtimes = [intake, classifierPrimary, classifierBackup, enricher, synthesizer, publisher];

  return {
    runtimes,
    graphRecorder: options.graphRecorder,
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

export const DEMO_V2_WORKER_IDENTITIES: readonly AgentIdentity[] = [
  {
    id: 'agent://intake',
    name: 'Incident Intake',
    version: PROTOCOL_VERSION,
    capabilities: ['incident.intake'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: CLASSIFIER_PRIMARY_ID,
    name: 'Classifier Primary',
    version: PROTOCOL_VERSION,
    capabilities: ['incident.classify'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: CLASSIFIER_BACKUP_ID,
    name: 'Classifier Backup',
    version: PROTOCOL_VERSION,
    capabilities: ['incident.classify'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://enricher',
    name: 'Incident Enricher',
    version: PROTOCOL_VERSION,
    capabilities: ['incident.enrich'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://synthesizer',
    name: 'Incident Synthesizer',
    version: PROTOCOL_VERSION,
    capabilities: ['incident.synthesize'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://publisher',
    name: 'Incident Publisher',
    version: PROTOCOL_VERSION,
    capabilities: ['incident.publish'],
    publicKey: PUBLIC_KEY,
  },
] as const;

/** Register worker identities on the server registry (discovery + mailboxes). */
export async function registerWorkersOnRegistry(app: FastifyInstance): Promise<void> {
  for (const identity of DEMO_V2_WORKER_IDENTITIES) {
    const response = await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity },
    });
    if (response.statusCode >= 400) {
      throw new Error(`Failed to register ${identity.id}: HTTP ${response.statusCode}`);
    }
  }
}

/** Wire Demo v2 workers and workflow onto an existing server context. */
export function bootstrapDemoV2(
  context: ServerContext,
  options: { readonly logger?: OacpLogger } = {},
): DemoV2WorkerBundle {
  const graphRecorder = context.delegationGraphRecorder;
  const workers = createDemoV2Workers(context.bus, {
    taskRecorder: context.taskRecorder,
    graphRecorder,
    ...(options.logger !== undefined ? { logger: options.logger } : {}),
  });
  registerIncidentResponseWorkflow(context.workflowEngine);
  return workers;
}
