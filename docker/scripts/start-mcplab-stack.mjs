#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { resolveMcplabRoot } from './resolve-mcplab-root.mjs';

const repoRoot = process.cwd();
const mcplabRoot = resolveMcplabRoot(repoRoot);

if (!mcplabRoot) {
  console.error('MCPLab not found — see integrate/mcplab/README.md');
  process.exit(1);
}

const mcplabCompose = resolve(mcplabRoot, 'docker-compose.yml');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function waitForContainerHealth(containerName, maxAttempts = 60, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync(
      'docker',
      ['inspect', '--format', '{{.State.Health.Status}}', containerName],
      { encoding: 'utf8', shell: process.platform === 'win32' },
    );
    const status = (result.stdout ?? '').trim();
    if (status === 'healthy') {
      return true;
    }
    if (attempt < maxAttempts) {
      spawnSync('node', ['-e', `setTimeout(()=>{}, ${delayMs})`], {
        shell: process.platform === 'win32',
      });
    }
  }
  return false;
}

function mcplabSyncEnv(baseEnv = process.env) {
  const apiKey = (baseEnv.OACP_API_KEY ?? '').trim();
  const syncSecret = (baseEnv.MCPLAB_SYNC_SECRET ?? apiKey).trim();
  return {
    ...baseEnv,
    OACP_IMPORT_FROM_MCPLAB: baseEnv.OACP_IMPORT_FROM_MCPLAB ?? '1',
    MCPLAB_OBSERVABILITY_EXPORT_URL:
      baseEnv.MCPLAB_OBSERVABILITY_EXPORT_URL ??
      'http://mcplab-api:8001/internal/observability/export',
    MCPLAB_TRACE_STATUS_WEBHOOK_URL:
      baseEnv.MCPLAB_TRACE_STATUS_WEBHOOK_URL ??
      'http://mcplab-api:8001/internal/observability/trace-status',
    ...(syncSecret.length > 0 ? { MCPLAB_SYNC_SECRET: syncSecret } : {}),
  };
}

console.log(`Using MCPLab at ${mcplabRoot}`);
const envFile = resolve(repoRoot, '.env');
const mcplabArgs = ['compose', '-f', mcplabCompose, '--env-file', envFile];
const syncEnv = mcplabSyncEnv();

console.log('Starting OACP platform (oacp-network, :3847 via gateway)...');
run('docker', ['compose', 'up', '--build', '-d', 'oacp', 'oacp-gateway'], {
  cwd: repoRoot,
  env: syncEnv,
});

console.log('');
console.log('Starting MCPLab full stack (client against platform OACP)...');
run('docker', [...mcplabArgs, 'up', '--build', '-d'], { cwd: repoRoot, env: syncEnv });

console.log('');
console.log('Waiting for MCPLab API health before observability backfill...');
if (waitForContainerHealth('mcplab-api')) {
  run('docker', ['compose', '--profile', 'mcplab-sync', 'run', '--rm', 'oacp-mcplab-sync'], {
    cwd: repoRoot,
    env: syncEnv,
  });
} else {
  console.warn(
    'MCPLab API not healthy — skip oacp-mcplab-sync (retry: docker compose --profile mcplab-sync run --rm oacp-mcplab-sync)',
  );
}

console.log('');
console.log('OACP Console: http://127.0.0.1:3847/console/');
console.log('MCPLab API:   http://127.0.0.1:8001');
console.log('MCPLab Web:   http://127.0.0.1:3002');
console.log('');
console.log('Observability sync enabled (OACP_IMPORT_FROM_MCPLAB=1).');
console.log('Manual repair: mcplab sync-oacp  (or re-run oacp-mcplab-sync sidecar)');
