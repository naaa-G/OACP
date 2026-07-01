/**
 * Shared setup for Demo v1 — document pipeline over HTTP (Day 14).
 */
import type { AgentIdentity, AgentRuntime, InMemoryMessageBus, OacpMessage } from '@oacp/core';
import { createAgentRuntime, PROTOCOL_VERSION } from '@oacp/core';
import type { FastifyInstance } from 'fastify';
import { DEFAULT_DEV_PUBLIC_KEY } from '@oacp/sdk';

/** Default demo input — incident triage document. */
export const DEMO_V1_INPUT = {
  document: '  INC-1042: latency spike in payment API  ',
} as const;

/** Expected structured output for smoke tests and `--verify`. */
export const DEMO_V1_EXPECTED_OUTPUT = {
  incident_id: 'INC-1042',
  severity: 'high',
  summary: 'Latency spike in payment API',
  report: 'INC-1042 — Latency spike in payment API (severity: high)',
} as const;

const PUBLIC_KEY = DEFAULT_DEV_PUBLIC_KEY;

export const DEMO_V1_WORKER_IDENTITIES: readonly AgentIdentity[] = [
  {
    id: 'agent://orchestrator',
    name: 'Document Orchestrator',
    version: PROTOCOL_VERSION,
    capabilities: ['document.pipeline'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://analyzer',
    name: 'Document Analyzer',
    version: PROTOCOL_VERSION,
    capabilities: ['document.analyze'],
    publicKey: PUBLIC_KEY,
  },
  {
    id: 'agent://reporter',
    name: 'Document Reporter',
    version: PROTOCOL_VERSION,
    capabilities: ['document.report'],
    publicKey: PUBLIC_KEY,
  },
] as const;

export interface DocumentPipelineWorkers {
  readonly orchestrator: AgentRuntime;
  readonly analyzer: AgentRuntime;
  readonly reporter: AgentRuntime;
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

/** Create A → B → C document pipeline workers on a shared bus. */
export function createDocumentPipelineWorkers(bus: InMemoryMessageBus): DocumentPipelineWorkers {
  const orchestratorIdentity = DEMO_V1_WORKER_IDENTITIES[0];
  const analyzerIdentity = DEMO_V1_WORKER_IDENTITIES[1];
  const reporterIdentity = DEMO_V1_WORKER_IDENTITIES[2];

  if (!orchestratorIdentity || !analyzerIdentity || !reporterIdentity) {
    throw new Error('Demo v1 worker identities are misconfigured');
  }

  const reporter = createAgentRuntime({
    identity: reporterIdentity,
    bus,
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

      if (!incidentId || !summary || !severity) {
        return chainError('Reporter requires incident_id, summary, and severity');
      }

      return {
        output: {
          incident_id: incidentId,
          severity,
          summary,
          report: `${incidentId} — ${summary} (severity: ${severity})`,
        },
      };
    },
  });

  const analyzer = createAgentRuntime({
    identity: analyzerIdentity,
    bus,
    onTask: async (task, ctx) => {
      const document = typeof task.input.document === 'string' ? task.input.document : '';
      const incidentId = parseIncidentId(document);
      if (!incidentId) {
        return chainError('Analyzer could not parse incident id');
      }

      const severity = inferSeverity(document);
      const summary = summarizeDocument(document, incidentId);

      const downstream = await ctx.sendSubTask({
        capability: 'document.report',
        input: { incident_id: incidentId, summary, severity },
      });

      if (!downstream.ok || !downstream.response) {
        return chainError('Downstream report failed');
      }

      const output = downstream.response.output;
      if (!output) {
        return chainError('Empty downstream report output');
      }

      return { output };
    },
  });

  const orchestrator = createAgentRuntime({
    identity: orchestratorIdentity,
    bus,
    onTask: async (task, ctx) => {
      const document = typeof task.input.document === 'string' ? task.input.document : '';
      const normalized = document.trim();

      const downstream = await ctx.sendSubTask({
        capability: 'document.analyze',
        input: { document: normalized },
      });

      if (!downstream.ok || !downstream.response) {
        return chainError('Downstream analyze failed');
      }

      const output = downstream.response.output;
      if (!output) {
        return chainError('Empty downstream analyze output');
      }

      return { output };
    },
  });

  return {
    orchestrator,
    analyzer,
    reporter,
    startAll() {
      reporter.start();
      analyzer.start();
      orchestrator.start();
    },
    stopAll() {
      orchestrator.stop();
      analyzer.stop();
      reporter.stop();
    },
  };
}

/** Register worker identities on the server registry (discovery + mailboxes). */
export async function registerWorkersOnRegistry(app: FastifyInstance): Promise<void> {
  for (const identity of DEMO_V1_WORKER_IDENTITIES) {
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

/** Human-readable timeline lines from trace messages. */
export function formatTraceTimeline(messages: readonly OacpMessage[]): string[] {
  return messages.map((message) => {
    if (message.type === 'task_request') {
      const target =
        message.to !== undefined ? ` → ${message.to}` : ` (capability: ${message.capability})`;
      return `[task_request] ${message.from}${target}`;
    }
    if (message.type === 'task_response') {
      return `[task_response] ${message.from} (status: ${message.status})`;
    }
    if (message.type === 'delegation') {
      return `[delegation] ${message.from} → capability ${message.capability}`;
    }
    return `[${message.type}] ${message.from}`;
  });
}
