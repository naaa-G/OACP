import { createApp, bootstrapStartupTeam } from '@oacp/server';

export interface ServeCommandOptions {
  readonly port: number;
  readonly host: string;
  readonly bootstrap: 'none' | 'startup';
}

export function parseServeCommandArgs(argv: readonly string[]): ServeCommandOptions | 'help' {
  let port = Number.parseInt(process.env.OACP_PORT ?? '3000', 10) || 3000;
  let host = process.env.OACP_HOST ?? '127.0.0.1';
  let bootstrap: 'none' | 'startup' = 'none';
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
    if (arg === '--port' || arg === '-p') {
      const next = argv[index + 1];
      if (next !== undefined) {
        port = Number.parseInt(next, 10) || 3000;
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
    if (arg === '--bootstrap') {
      const next = argv[index + 1];
      if (next === 'startup' || next === 'none') {
        bootstrap = next;
        index += 1;
      }
      continue;
    }
  }

  if (help) {
    return 'help';
  }

  return { port, host, bootstrap };
}

export function printServeHelp(): void {
  console.log(`oacp serve — start the OACP reference HTTP server

Usage:
  oacp serve
  oacp serve --bootstrap startup

Options:
  --port, -p PORT          Listen port (default: OACP_PORT or 3000)
  --host HOST              Bind host (default: 127.0.0.1)
  --bootstrap startup|none Preload startup team agents + workflow (default: none)
  -h, --help               Show this help
`);
}

export async function runServeCommand(options: ServeCommandOptions): Promise<number> {
  const { app, context } = createApp({ logger: true });

  let team: ReturnType<typeof bootstrapStartupTeam> | undefined;
  if (options.bootstrap === 'startup') {
    team = bootstrapStartupTeam(context);
    console.log('[oacp] Startup team agents and workflow loaded');
  }

  const url = await app.listen({ host: options.host, port: options.port });
  console.log(`[oacp] Reference server listening at ${url}`);
  console.log(`[oacp] Console: ${url}/console/`);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[oacp] Received ${signal}, shutting down…`);
    team?.stop();
    await context.memoryStore.close();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  return 0;
}
