#!/usr/bin/env node
/**
 * Run .github/workflows/ci.yml locally via nektos/act + Docker.
 *
 * Usage:
 *   pnpm ci:act verify
 *   pnpm ci:act e2e
 *   pnpm ci:act verify -n
 *   pnpm ci:act verify -- -n --verbose
 *
 * Prerequisites: Docker Desktop running, `act` on PATH.
 * See docs/ci-local-act.md
 */

import { spawnSync } from 'node:child_process';

const JOB_ALIASES = {
  verify: 'verify',
  e2e: 'console-e2e',
  'console-e2e': 'console-e2e',
  python: 'python-sdk',
  'python-sdk': 'python-sdk',
  docker: 'docker-compose',
  'docker-compose': 'docker-compose',
};

const ACT_FLAGS = new Set([
  '-n',
  '--dryrun',
  '--dry-run',
  '--list',
  '-l',
  '--verbose',
  '-v',
  '--watch',
  '-w',
]);

const FULL_IMAGE = 'catthehacker/ubuntu:full-latest';
const JOBS_NEEDING_FULL_IMAGE = new Set(['e2e', 'console-e2e', 'docker', 'docker-compose', 'all']);

function printUsage() {
  console.log(`Usage: pnpm ci:act <job> [act flags...]

Jobs:
  verify         CI Verify job (pnpm verify, day55/56/59, docs:build)
  e2e            Console Playwright suite (linux Chromium)
  python         Python SDK verify script
  docker         Docker Compose smoke (host Docker socket)
  all            all jobs in ci.yml

Examples:
  pnpm ci:act verify
  pnpm ci:act verify -n
  pnpm ci:act e2e
  pnpm ci:act verify -- --verbose
`);
}

const argv = process.argv.slice(2);
const dashDash = argv.indexOf('--');
const beforeDash = dashDash === -1 ? argv : argv.slice(0, dashDash);
const afterDash = dashDash === -1 ? [] : argv.slice(dashDash + 1);

const jobKey = beforeDash[0];
if (jobKey === undefined || jobKey === '-h' || jobKey === '--help') {
  printUsage();
  process.exit(jobKey === undefined ? 1 : 0);
}

const inlineActArgs = beforeDash.slice(1);
const unknownInline = inlineActArgs.filter((arg) => !ACT_FLAGS.has(arg) && !arg.startsWith('-'));
if (unknownInline.length > 0) {
  console.error(`Unknown argument(s): ${unknownInline.join(', ')}`);
  printUsage();
  process.exit(1);
}

const actArgs = [
  'push',
  '--pull=false',
  '--env',
  'FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true',
  '--env',
  'OACP_TEST_SQLITE_DIR=/tmp/oacp-tests',
];

if (JOBS_NEEDING_FULL_IMAGE.has(jobKey)) {
  actArgs.push('-P', `ubuntu-latest=${FULL_IMAGE}`);
}

if (jobKey === 'all') {
  actArgs.push('--workflow', '.github/workflows/ci.yml');
} else {
  const jobId = JOB_ALIASES[jobKey];
  if (jobId === undefined) {
    console.error(`Unknown job "${jobKey}".`);
    printUsage();
    process.exit(1);
  }
  actArgs.push('-j', jobId);
}

if (jobKey === 'docker' || jobKey === 'docker-compose') {
  actArgs.push('--privileged');
  // act `-v` is --verbose, not a bind mount. Mount the host Docker socket explicitly.
  const dockerSocket =
    process.platform === 'win32' ? 'npipe:////./pipe/docker_engine' : 'unix:///var/run/docker.sock';
  actArgs.push('--container-daemon-socket', dockerSocket);
}

actArgs.push(...inlineActArgs, ...afterDash);

console.log(`> act ${actArgs.join(' ')}`);
const result = spawnSync('act', actArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
