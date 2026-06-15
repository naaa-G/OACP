/**
 * OACP Day 25 — Bug-finder swarm gallery demo.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:bug-finder-swarm
 *
 * Env:
 *   OACP_BUG_REPO         — repository name
 *   OACP_BUG_LOG_EXCERPT  — log snippet to analyze
 *   OACP_BUG_FINDER_SIMULATE_FAILURE — primary reproduce fails; backup recovers (1/true)
 *
 * Flags:
 *   --verify           — CI smoke
 *   --verify-recovery  — CI smoke with reproduce failover
 */
import { runGalleryDemoMain } from '../shared/run-gallery-demo.js';
import {
  BUG_FINDER_SWARM_DEFAULT_INPUT,
  BUG_FINDER_SWARM_EXPECTED_OUTPUT,
  BUG_FINDER_SWARM_WORKFLOW_ID,
  bootstrapBugFinderSwarm,
  bugFinderOutputsMatch,
} from './setup.js';

const input = {
  repo: process.env.OACP_BUG_REPO ?? BUG_FINDER_SWARM_DEFAULT_INPUT.repo,
  log_excerpt: process.env.OACP_BUG_LOG_EXCERPT ?? BUG_FINDER_SWARM_DEFAULT_INPUT.log_excerpt,
};

runGalleryDemoMain({
  section: 'bug-finder-swarm',
  workflowId: BUG_FINDER_SWARM_WORKFLOW_ID,
  workersLabel: 'scanner, triager, reproduce-primary, reproduce-backup, analyzer, fixer, verifier',
  input,
  expectedOutput: BUG_FINDER_SWARM_EXPECTED_OUTPUT,
  bootstrap: bootstrapBugFinderSwarm,
  outputsMatch: (actual, expected, options) =>
    bugFinderOutputsMatch(actual, expected as typeof BUG_FINDER_SWARM_EXPECTED_OUTPUT, options),
  verifyThresholds: { memoryMin: 5, graphNodesMin: 6, messagesMin: 12 },
  simulateFailureEnvKey: 'OACP_BUG_FINDER_SIMULATE_FAILURE',
});
