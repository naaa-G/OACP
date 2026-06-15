/**
 * Re-exports startup team bootstrap from @oacp/server.
 * Examples and docs refer to this path for discoverability.
 */
export {
  STARTUP_TEAM_DEFAULT_PROMPT,
  STARTUP_TEAM_EXPECTED_OUTPUT,
  STARTUP_TEAM_WORKFLOW_ID,
  STARTUP_TEAM_WORKER_IDENTITIES,
  bootstrapStartupTeam,
  createStartupTeamWorkflow,
  createStartupTeamWorkers,
  registerStartupTeamWorkflow,
  slugFromPrompt,
} from '@oacp/server';

export type { StartupTeamBootstrap, StartupTeamWorkerBundle } from '@oacp/server';

import type { FastifyInstance } from 'fastify';

import { STARTUP_TEAM_WORKER_IDENTITIES } from '@oacp/server';

/** Register worker identities via HTTP POST /agents (integration / multi-process setups). */
export async function registerStartupTeamOnRegistry(app: FastifyInstance): Promise<void> {
  for (const identity of STARTUP_TEAM_WORKER_IDENTITIES) {
    const response = await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity },
    });
    if (response.statusCode >= 400) {
      throw new Error(`Failed to register ${identity.id}: HTTP ${response.statusCode}`);
    }
  }
}
