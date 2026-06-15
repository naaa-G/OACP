/**
 * OACP Day 25 — Research swarm gallery demo.
 *
 * Run:
 *   pnpm build
 *   pnpm --filter oacp-examples start:research-swarm
 *
 * Env:
 *   OACP_RESEARCH_TOPIC — research topic override
 */
import { runGalleryDemoMain } from '../shared/run-gallery-demo.js';
import {
  RESEARCH_SWARM_DEFAULT_INPUT,
  RESEARCH_SWARM_EXPECTED_OUTPUT,
  RESEARCH_SWARM_WORKFLOW_ID,
  bootstrapResearchSwarm,
  researchOutputsMatch,
} from './setup.js';

const input = {
  topic: process.env.OACP_RESEARCH_TOPIC ?? RESEARCH_SWARM_DEFAULT_INPUT.topic,
};

runGalleryDemoMain({
  section: 'research-swarm',
  workflowId: RESEARCH_SWARM_WORKFLOW_ID,
  workersLabel: 'gatherer, keyword extractor, ranker, analyzer, synthesizer, publisher',
  input,
  expectedOutput: RESEARCH_SWARM_EXPECTED_OUTPUT,
  bootstrap: bootstrapResearchSwarm,
  outputsMatch: (actual, expected, _options) =>
    researchOutputsMatch(actual, expected as typeof RESEARCH_SWARM_EXPECTED_OUTPUT),
  verifyThresholds: { memoryMin: 5, graphNodesMin: 5, messagesMin: 10 },
});
