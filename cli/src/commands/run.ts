import { noopLogger } from '@oacp/core';
import { createApp, bootstrapStartupTeam, STARTUP_TEAM_WORKFLOW_ID } from '@oacp/server';
import { AgentClient } from '@oacp/sdk';

import type { OutputFormat } from '../output.js';
import { formatDisplayValue, printJson } from '../output.js';

export interface RunCommandOptions {
  readonly prompt: string;
  readonly format: OutputFormat;
  readonly timeoutMs: number;
  readonly host: string;
  readonly port: number;
  readonly keepAlive: boolean;
  readonly quiet: boolean;
  readonly remoteBaseUrl?: string;
}

export interface RunCommandResult {
  readonly ok: true;
  readonly baseUrl: string;
  readonly traceId: string;
  readonly output: Record<string, unknown>;
  readonly runId: string;
}

function parseTimeoutMs(): number {
  const raw = process.env.OACP_TIMEOUT_MS?.trim();
  if (raw === undefined || raw.length === 0) {
    return 60_000;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}

export function parseRunCommandArgs(argv: readonly string[]): RunCommandOptions | 'help' {
  let prompt = '';
  let format: OutputFormat = 'text';
  let host = '127.0.0.1';
  let port = Number.parseInt(process.env.OACP_PORT ?? '0', 10) || 0;
  let keepAlive = false;
  let quiet = false;
  let remoteBaseUrl: string | undefined;
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
    if (arg === '--format' || arg === '-f') {
      const next = argv[index + 1];
      if (next === 'json' || next === 'text') {
        format = next;
        index += 1;
      }
      continue;
    }
    if (arg === '--host') {
      const next = argv[index + 1];
      if (next !== undefined) {
        host = next;
        index += 1;
      }
      continue;
    }
    if (arg === '--port' || arg === '-p') {
      const next = argv[index + 1];
      if (next !== undefined) {
        port = Number.parseInt(next, 10) || 0;
        index += 1;
      }
      continue;
    }
    if (arg === '--keep-alive' || arg === '--watch') {
      keepAlive = true;
      continue;
    }
    if (arg === '--quiet' || arg === '-q') {
      quiet = true;
      continue;
    }
    if (arg === '--base-url' || arg === '-u') {
      const next = argv[index + 1];
      if (next !== undefined) {
        remoteBaseUrl = next.replace(/\/+$/, '');
        index += 1;
      }
      continue;
    }
    if (arg === '--prompt') {
      const next = argv[index + 1];
      if (next !== undefined) {
        prompt = next;
        index += 1;
      }
      continue;
    }
    if (!arg.startsWith('-') && prompt.length === 0) {
      prompt = arg;
    } else if (!arg.startsWith('-') && prompt.length > 0) {
      prompt = `${prompt} ${arg}`;
    }
  }

  if (help) {
    return 'help';
  }

  if (prompt.trim().length === 0) {
    throw new Error('Missing prompt. Usage: oacp run "build todo app"');
  }

  if (keepAlive && port === 0) {
    port = Number.parseInt(process.env.OACP_PORT ?? '3000', 10) || 3000;
  }

  return {
    prompt: prompt.trim(),
    format,
    timeoutMs: parseTimeoutMs(),
    host,
    port,
    keepAlive,
    quiet,
    ...(remoteBaseUrl !== undefined ? { remoteBaseUrl } : {}),
  };
}

export function printRunHelp(): void {
  console.log(`oacp run — Autonomous Startup Team (Day 23)

Usage:
  oacp run <prompt>
  oacp run --prompt "build todo app"

Options:
  --format json|text       Output format (default: text)
  --base-url URL           Use an existing server (skip local bootstrap)
  --host HOST              Bind host for ephemeral server (default: 127.0.0.1)
  --port, -p PORT          Listen port (0 = ephemeral; default 3000 with --keep-alive)
  --keep-alive, --watch    Keep server running after the workflow (playground friendly)
  --quiet, -q              Suppress progress logs (automatic with --format json)
  -h, --help               Show this help

Examples:
  oacp run "build todo app"
  oacp run "build habit tracker" --format json
  oacp run "build todo app" --keep-alive
`);
}

export async function runRunCommand(options: RunCommandOptions): Promise<number> {
  const quiet = options.quiet || options.format === 'json';

  if (options.remoteBaseUrl !== undefined) {
    return runAgainstRemoteServer({ ...options, quiet });
  }

  const { app, context } = createApp({ logger: false });
  const team = bootstrapStartupTeam(context, quiet ? { logger: noopLogger } : {});

  const listenPort = options.keepAlive && options.port === 0 ? 3000 : options.port;
  const baseUrl = await app.listen({ host: options.host, port: listenPort });

  try {
    if (!quiet) {
      console.log(`[oacp] Server listening at ${baseUrl}`);
      console.log(`[oacp] Running workflow ${STARTUP_TEAM_WORKFLOW_ID}`);
      console.log(`[oacp] Prompt: "${options.prompt}"`);
    }

    const client = new AgentClient({ baseUrl, timeoutMs: options.timeoutMs });
    const result = await client.runWorkflow(STARTUP_TEAM_WORKFLOW_ID, {
      prompt: options.prompt,
    });

    if (!result.ok) {
      console.error(`[oacp] Workflow failed: ${result.error?.message ?? 'unknown error'}`);
      return 1;
    }

    printRunOutput({
      baseUrl,
      traceId: result.traceId,
      output: result.output ?? {},
      runId: result.runId,
      format: options.format,
      quiet,
    });

    if (options.keepAlive) {
      if (!quiet) {
        console.log('');
        console.log(`[oacp] Playground: ${baseUrl}/playground?trace_id=${result.traceId}`);
        console.log('[oacp] Press Ctrl+C to stop');
      }
      await waitForShutdown();
    }

    return 0;
  } finally {
    team.stop();
    await context.memoryStore.close();
    await app.close();
  }
}

async function runAgainstRemoteServer(options: RunCommandOptions): Promise<number> {
  const baseUrl = options.remoteBaseUrl;
  if (baseUrl === undefined) {
    return 1;
  }

  const client = new AgentClient({ baseUrl, timeoutMs: options.timeoutMs });
  const result = await client.runWorkflow(STARTUP_TEAM_WORKFLOW_ID, {
    prompt: options.prompt,
  });

  if (!result.ok) {
    console.error(`[oacp] Workflow failed: ${result.error?.message ?? 'unknown error'}`);
    return 1;
  }

  printRunOutput({
    baseUrl,
    traceId: result.traceId,
    output: result.output ?? {},
    runId: result.runId,
    format: options.format,
    quiet: options.quiet,
  });
  return 0;
}

function printRunOutput(params: {
  readonly baseUrl: string;
  readonly traceId: string;
  readonly output: Record<string, unknown>;
  readonly runId: string;
  readonly format: OutputFormat;
  readonly quiet: boolean;
}): void {
  if (params.format === 'json') {
    printJson({
      ok: true,
      trace_id: params.traceId,
      run_id: params.runId,
      base_url: params.baseUrl,
      playground_url: `${params.baseUrl}/playground?trace_id=${params.traceId}`,
      output: params.output,
    });
    return;
  }

  if (!params.quiet) {
    console.log('');
  }
  console.log(
    `Project: ${formatDisplayValue(params.output.project_name ?? params.output.project_slug, 'unknown')}`,
  );
  console.log(`QA: ${formatDisplayValue(params.output.qa_status, 'unknown')}`);
  console.log(`Summary: ${formatDisplayValue(params.output.summary)}`);
  if (Array.isArray(params.output.repo_structure)) {
    console.log('');
    console.log('Repo scaffold:');
    for (const file of params.output.repo_structure) {
      console.log(`  ${formatDisplayValue(file)}`);
    }
  }
  console.log('');
  console.log(`Trace: ${params.traceId}`);
  console.log(`Playground: ${params.baseUrl}/playground?trace_id=${params.traceId}`);
}

function waitForShutdown(): Promise<void> {
  return new Promise((resolve) => {
    const handler = (): void => {
      resolve();
    };
    process.on('SIGINT', handler);
    process.on('SIGTERM', handler);
  });
}
