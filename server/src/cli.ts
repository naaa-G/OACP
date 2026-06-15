import { loadServerConfig } from './config.js';
import { startServer } from './server.js';

async function main(): Promise<void> {
  const config = loadServerConfig();
  const server = await startServer({ config, logger: true });
  console.log(`OACP reference server listening at ${server.url}`);
  console.log('Browser: open / (redirects to playground) or /playground');
  console.log('Endpoints: POST /send-message, GET /agent/:id, POST /agents, GET /health');
  console.log('Memory: GET /memory/scopes, GET /memory/entries, GET /memory/traces/:traceId');
  console.log('Graph: GET /graph/traces/:traceId');
  console.log('Traces: GET /traces, GET /traces/:traceId, GET /trace-viewer');
  console.log('Playground: GET /playground, GET /playground/snapshot');
  console.log('CLI: pnpm --filter @oacp/server trace -- <trace-id>');
  console.log(
    'Workflows: GET /workflows, POST /workflows, POST /workflows/:id/run, GET /workflows/runs/:runId',
  );

  if (process.env.OACP_DEV_WORKFLOWS?.trim()) {
    console.log('Dev workflows: echo-workflow, document-dag (OACP_DEV_WORKFLOWS enabled)');
  } else {
    console.log(
      'Tip: set OACP_DEV_WORKFLOWS=1 to preload echo-workflow + document-dag for HTTP demos',
    );
  }

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, shutting down...`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
