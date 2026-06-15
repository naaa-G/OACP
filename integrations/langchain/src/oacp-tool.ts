import { tool, type StructuredToolInterface } from '@langchain/core/tools';

import { capabilityToToolName, executeOacpCapabilityTask } from './execute-task.js';
import type { CreateOacpToolOptions, CreateOacpToolkitOptions } from './types.js';

/**
 * Create a LangChain {@link StructuredToolInterface} that delegates to an OACP capability.
 *
 * Bind the returned tool to an LLM or invoke directly for smoke tests (no API key required).
 */
export function createOacpTool(options: CreateOacpToolOptions): StructuredToolInterface {
  const name = options.name ?? capabilityToToolName(options.capability);
  const description =
    options.description ??
    `Delegate work to OACP capability "${options.capability}" on the agent network.`;

  return tool(
    async (input: Record<string, unknown>) => {
      const output = await executeOacpCapabilityTask(options.client, {
        from: options.coordinatorId,
        capability: options.capability,
        input,
      });
      return JSON.stringify(output, null, 2);
    },
    {
      name,
      description,
      schema: options.schema,
    },
  );
}

/** Create multiple LangChain tools from OACP capability definitions. */
export function createOacpToolkit(options: CreateOacpToolkitOptions): StructuredToolInterface[] {
  return options.tools.map((definition) =>
    createOacpTool({
      client: options.client,
      coordinatorId: options.coordinatorId,
      capability: definition.capability,
      ...(definition.name !== undefined ? { name: definition.name } : {}),
      ...(definition.description !== undefined ? { description: definition.description } : {}),
      schema: definition.schema,
    }),
  );
}
