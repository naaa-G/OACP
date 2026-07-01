import type { ServerConfig } from '../config.js';
import type { ServerContext } from '../api/http/types.js';
import type { McplabObservabilityExportBundle } from './observability-persistence.js';
import { importObservabilityTrace } from './observability-import.js';

export interface McplabSyncResult {
  readonly imported_traces: number;
  readonly skipped_traces: number;
  readonly failed_traces: number;
}

function buildAuthHeaders(apiKey: string | undefined): Record<string, string> {
  if (apiKey === undefined || apiKey.length === 0) {
    return {};
  }
  return { Authorization: `Bearer ${apiKey}` };
}

/** Fetch MCPLab observability export bundle (Day 53). */
export async function fetchMcplabObservabilityExport(
  config: Pick<ServerConfig, 'mcplabExportUrl' | 'mcplabSyncSecret' | 'apiKey'>,
): Promise<McplabObservabilityExportBundle | undefined> {
  if (config.mcplabExportUrl === undefined || config.mcplabExportUrl.length === 0) {
    return undefined;
  }

  const headers = {
    Accept: 'application/json',
    ...buildAuthHeaders(config.mcplabSyncSecret ?? config.apiKey),
  };

  const response = await fetch(config.mcplabExportUrl, { headers });
  if (!response.ok) {
    throw new Error(`MCPLab export failed (HTTP ${response.status})`);
  }

  return (await response.json()) as McplabObservabilityExportBundle;
}

/** Backfill traces missing from OACP persistence (startup / sidecar). */
export async function runMcplabStartupSync(
  context: ServerContext,
  config: Pick<
    ServerConfig,
    'mcplabExportUrl' | 'mcplabSyncSecret' | 'apiKey' | 'importFromMcplabOnStartup'
  >,
): Promise<McplabSyncResult | undefined> {
  if (!config.importFromMcplabOnStartup) {
    return undefined;
  }

  const bundle = await fetchMcplabObservabilityExport(config);
  if (bundle === undefined || bundle.exports.length === 0) {
    return { imported_traces: 0, skipped_traces: 0, failed_traces: 0 };
  }

  let importedTraces = 0;
  let skippedTraces = 0;
  let failedTraces = 0;

  for (const traceExport of bundle.exports) {
    if (context.observabilityPersistence.hasTrace(traceExport.trace_id)) {
      skippedTraces += 1;
      continue;
    }

    try {
      await importObservabilityTrace(context, traceExport);
      importedTraces += 1;
    } catch {
      failedTraces += 1;
    }
  }

  return {
    imported_traces: importedTraces,
    skipped_traces: skippedTraces,
    failed_traces: failedTraces,
  };
}

/** Mirror trace completion status to MCPLab run row (Day 53). */
export async function mirrorTraceCompletionToMcplab(
  config: Pick<ServerConfig, 'mcplabStatusWebhookUrl' | 'mcplabSyncSecret' | 'apiKey'>,
  payload: {
    readonly trace_id: string;
    readonly message_count: number;
    readonly completed_at: string;
    readonly run_id?: string | undefined;
  },
): Promise<void> {
  if (config.mcplabStatusWebhookUrl === undefined || config.mcplabStatusWebhookUrl.length === 0) {
    return;
  }

  await fetch(config.mcplabStatusWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...buildAuthHeaders(config.mcplabSyncSecret ?? config.apiKey),
    },
    body: JSON.stringify({
      trace_id: payload.trace_id,
      trace_status: 'completed',
      message_count: payload.message_count,
      completed_at: payload.completed_at,
      ...(payload.run_id !== undefined ? { run_id: payload.run_id } : {}),
    }),
  });
}
