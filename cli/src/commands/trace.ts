import { formatTraceTimeline, TraceClient, TraceClientError } from '@oacp/core';
import type { TraceBundle } from '@oacp/core';

import type { OutputFormat } from '../output.js';
import { printJson, resolveBaseUrl } from '../output.js';

export interface TraceCommandOptions {
  readonly traceId?: string;
  readonly baseUrl: string;
  readonly format: OutputFormat;
  readonly list: boolean;
  readonly limit: number;
}

export function parseTraceCommandArgs(argv: readonly string[]): TraceCommandOptions | 'help' {
  let traceId: string | undefined;
  let format: OutputFormat = 'text';
  let list = false;
  let limit = 20;
  let baseUrl = resolveBaseUrl(undefined) ?? 'http://127.0.0.1:3000';
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) {
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg === '--list' || arg === '-l') {
      list = true;
      continue;
    }
    if (arg === '--base-url' || arg === '-u') {
      const next = argv[index + 1];
      if (next !== undefined) {
        baseUrl = next.replace(/\/+$/, '');
        index += 1;
      }
      continue;
    }
    if (arg === '--format' || arg === '-f') {
      const next = argv[index + 1];
      if (next === 'json' || next === 'text') {
        format = next;
        index += 1;
      }
      continue;
    }
    if (arg === '--limit' || arg === '-n') {
      const next = argv[index + 1];
      if (next !== undefined) {
        limit = Number.parseInt(next, 10);
        index += 1;
      }
      continue;
    }
    if (!arg.startsWith('-') && traceId === undefined) {
      traceId = arg;
    }
  }

  if (help) {
    return 'help';
  }

  return {
    ...(traceId !== undefined ? { traceId } : {}),
    baseUrl,
    format,
    list,
    limit,
  };
}

export function printTraceHelp(): void {
  console.log(`oacp trace — inspect traces on a running server

Usage:
  oacp trace <trace-id>
  oacp trace --list

Options:
  --base-url, -u URL       Server base URL (default: OACP_BASE_URL or http://127.0.0.1:3000)
  --format json|text       Output format (default: text)
  --limit, -n N            Max traces when listing (default: 20)
  -h, --help               Show this help
`);
}

export async function runTraceCommand(options: TraceCommandOptions): Promise<number> {
  const client = new TraceClient({ baseUrl: options.baseUrl });

  try {
    if (options.list) {
      const result = await client.listTraces({ limit: options.limit });
      if (options.format === 'json') {
        printJson(result);
        return 0;
      }

      console.log(`Traces (${String(result.count)}/${String(result.total)} shown):\n`);
      for (const trace of result.traces) {
        console.log(`  ${trace.traceId}`);
        console.log(
          `    ${String(trace.messageCount)} msgs · ${trace.agents.join(', ')} · last ${trace.lastActivityAt}`,
        );
      }
      return 0;
    }

    if (options.traceId === undefined) {
      printTraceHelp();
      return 1;
    }

    const trace: TraceBundle = await client.getTrace(options.traceId);

    if (options.format === 'json') {
      printJson(trace);
      return 0;
    }

    console.log(`\nTrace: ${trace.trace_id}`);
    console.log(`Started: ${trace.started_at}`);
    console.log(`Last activity: ${trace.last_activity_at}`);
    console.log(`Agents: ${trace.agents.join(', ')}`);
    console.log('');
    console.log(
      formatTraceTimeline(trace.timeline, {
        ...(trace.graph !== undefined ? { graph: trace.graph } : {}),
        prefix: '',
      }),
    );
    console.log('');
    return 0;
  } catch (error) {
    if (error instanceof TraceClientError) {
      const prefix = error.statusCode === 0 ? '[oacp]' : `Error (${String(error.statusCode)})`;
      console.error(`${prefix}: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`[oacp] ${error.message}`);
    } else {
      console.error(String(error));
    }
    return 1;
  }
}
