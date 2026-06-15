#!/usr/bin/env node
/**
 * OACP trace viewer CLI — fetch and display traces from a running reference server.
 *
 * Usage:
 *   oacp-trace <trace-id> [--base-url URL] [--format text|json]
 *   oacp-trace --list [--base-url URL]
 */
import { formatTraceTimeline, TraceClient, TraceClientError } from '@oacp/core';
import type { TraceBundle } from '@oacp/core';

function parseArgs(argv: readonly string[]): {
  traceId?: string;
  baseUrl: string;
  format: 'text' | 'json';
  list: boolean;
  limit: number;
} {
  let traceId: string | undefined;
  let baseUrl = process.env.OACP_BASE_URL ?? 'http://127.0.0.1:3000';
  let format: 'text' | 'json' = 'text';
  let list = false;
  let limit = 20;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) {
      continue;
    }
    if (arg === '--list' || arg === '-l') {
      list = true;
      continue;
    }
    if (arg === '--base-url' || arg === '-u') {
      const next = argv[index + 1];
      if (next !== undefined) {
        baseUrl = next;
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
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (!arg.startsWith('-') && traceId === undefined) {
      traceId = arg;
    }
  }

  return {
    ...(traceId !== undefined ? { traceId } : {}),
    baseUrl,
    format,
    list,
    limit,
  };
}

function printHelp(): void {
  console.log(`OACP Trace Viewer (Day 20)

Usage:
  oacp-trace <trace-id>              Show a trace timeline
  oacp-trace --list                    List recent traces
  oacp-trace --base-url URL            Server base URL (default: OACP_BASE_URL or http://127.0.0.1:3000)
  oacp-trace --format json|text        Output format (default: text)

Environment:
  OACP_BASE_URL   Default server URL
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const client = new TraceClient({ baseUrl: args.baseUrl });

  try {
    if (args.list) {
      const result = await client.listTraces({ limit: args.limit });
      if (args.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`Traces (${String(result.count)}/${String(result.total)} shown):\n`);
      for (const trace of result.traces) {
        console.log(`  ${trace.traceId}`);
        console.log(
          `    ${String(trace.messageCount)} msgs · ${trace.agents.join(', ')} · last ${trace.lastActivityAt}`,
        );
      }
      return;
    }

    if (!args.traceId) {
      printHelp();
      process.exitCode = 1;
      return;
    }

    const trace: TraceBundle = await client.getTrace(args.traceId);

    if (args.format === 'json') {
      console.log(JSON.stringify(trace, null, 2));
      return;
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
  } catch (error) {
    if (error instanceof TraceClientError) {
      console.error(`Error (${String(error.statusCode)}): ${error.message}`);
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
