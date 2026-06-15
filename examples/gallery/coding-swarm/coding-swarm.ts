/**
 * OACP Day 25 — Coding swarm gallery demo.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:coding-swarm
 *
 * Env:
 *   OACP_CODING_MODULE  — target module (default: auth-service)
 *   OACP_CODING_TASK    — change description
 */
import { runGalleryDemoMain } from '../shared/run-gallery-demo.js';
import {
  CODING_SWARM_DEFAULT_INPUT,
  CODING_SWARM_EXPECTED_OUTPUT,
  CODING_SWARM_WORKFLOW_ID,
  bootstrapCodingSwarm,
  codingOutputsMatch,
} from './setup.js';

const input = {
  module: process.env.OACP_CODING_MODULE ?? CODING_SWARM_DEFAULT_INPUT.module,
  task: process.env.OACP_CODING_TASK ?? CODING_SWARM_DEFAULT_INPUT.task,
};

runGalleryDemoMain({
  section: 'coding-swarm',
  workflowId: CODING_SWARM_WORKFLOW_ID,
  workersLabel: 'planner, implementer, reviewer, tester, deliverer',
  input,
  expectedOutput: CODING_SWARM_EXPECTED_OUTPUT,
  bootstrap: bootstrapCodingSwarm,
  outputsMatch: (actual, expected, _options) =>
    codingOutputsMatch(actual, expected as typeof CODING_SWARM_EXPECTED_OUTPUT),
  verifyThresholds: { memoryMin: 4, graphNodesMin: 4, messagesMin: 8 },
});
