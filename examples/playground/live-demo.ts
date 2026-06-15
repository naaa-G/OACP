/**
 * Playground live demo — Day 23 flagship: Autonomous Startup Team + playground.
 *
 * Usage:
 *   pnpm --filter oacp-examples start:playground
 *   pnpm --filter oacp-examples start:playground -- --loop
 *   pnpm --filter oacp-examples start:playground -- --idle
 *
 * Env:
 *   OACP_PORT              — listen port (default 3000)
 *   OACP_STARTUP_PROMPT    — product prompt for the team
 */
import { AgentClient } from '@oacp/sdk';
import { createApp } from '@oacp/server';

import {
  STARTUP_TEAM_DEFAULT_PROMPT,
  STARTUP_TEAM_WORKFLOW_ID,
  bootstrapStartupTeam,
} from '../startup-team/setup.js';

function parseEnv(): {
  readonly port: number;
  readonly loop: boolean;
  readonly idle: boolean;
  readonly prompt: string;
} {
  return {
    port: Number.parseInt(process.env.OACP_PORT ?? '3000', 10) || 3000,
    loop: process.argv.includes('--loop'),
    idle: process.argv.includes('--idle'),
    prompt: process.env.OACP_STARTUP_PROMPT ?? STARTUP_TEAM_DEFAULT_PROMPT,
  };
}

function log(section: string, message: string): void {
  console.log(`[${section}] ${message}`);
}

async function runWorkflow(baseUrl: string, prompt: string): Promise<string | undefined> {
  const client = new AgentClient({ baseUrl, timeoutMs: 60_000 });
  const result = await client.runWorkflow(STARTUP_TEAM_WORKFLOW_ID, { prompt });

  if (!result.ok) {
    log('workflow', `Failed: ${result.error?.message ?? 'unknown error'}`);
    return undefined;
  }

  log(
    'workflow',
    `Delivered "${result.output?.project_name ?? 'project'}" — trace ${result.traceId}`,
  );
  return result.traceId;
}

async function main(): Promise<void> {
  const env = parseEnv();
  const { app, context } = createApp({ logger: false });
  const team = bootstrapStartupTeam(context);

  const host = '127.0.0.1';
  const listenUrl = await app.listen({ host, port: env.port });
  const baseUrl = process.env.OACP_BASE_URL ?? listenUrl;
  const playgroundUrl = `${baseUrl}/playground`;

  log('server', `Listening at ${baseUrl}`);
  log('playground', playgroundUrl);
  log('hint', `Browser: open ${baseUrl} (redirects to playground)`);
  log('hint', `Prompt: "${env.prompt}"`);
  log('hint', `Workflow: ${STARTUP_TEAM_WORKFLOW_ID} (Autonomous Startup Team)`);

  const shutdown = async (signal: string): Promise<void> => {
    log('server', `Received ${signal}, shutting down…`);
    team.stop();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  if (env.idle) {
    log('ready', 'Idle mode — run start:startup in another terminal to populate traces.');
    return;
  }

  const traceId = await runWorkflow(baseUrl, env.prompt);
  if (traceId) {
    log('playground', `${playgroundUrl}?trace_id=${traceId}`);
  }

  if (env.loop) {
    log('loop', 'Re-running startup team every 20s (Ctrl+C to stop)');
    setInterval(() => {
      void runWorkflow(baseUrl, env.prompt);
    }, 20_000);
    return;
  }

  log('ready', 'Startup team idle — run again with --loop or re-run start:startup.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
