#!/usr/bin/env node
/**
 * OACP MCP tools server (Day 58) — stdio transport wrapping existing HTTP API.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { buildConsoleTraceUrl, createOacpClientFromEnv } from './oacp-client.js';

const DEV_PUBLIC_KEY = {
  kty: 'EC',
  crv: 'P-256',
  x: 'WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWlibY',
  y: 'ALOpExF7nDwyk9V4ToWo3L5v_6Y1sQJCrcn_6OlOWf5',
  use: 'sig',
  alg: 'ES256',
  kid: 'summarizer-2026',
};

const client = createOacpClientFromEnv();

const server = new McpServer({
  name: 'oacp-mcp',
  version: '1.0.0',
});

server.tool('oacp_health', 'Check OACP server health and registered agent count', {}, async () => {
  const health = await client.health();
  return {
    content: [{ type: 'text', text: JSON.stringify(health, null, 2) }],
  };
});

server.tool(
  'oacp_register_agent',
  'Register an agent on the OACP server (dev public key for demos)',
  {
    agent_id: z.string().describe('Agent URI, e.g. agent://my-coordinator'),
    name: z.string(),
    capabilities: z.array(z.string()).min(1),
    fleet: z.string().optional(),
    role: z.string().optional(),
  },
  async ({ agent_id, name, capabilities, fleet, role }) => {
    const metadata: Record<string, string> = {};
    if (fleet !== undefined) metadata.fleet = fleet;
    if (role !== undefined) metadata.role = role;

    const result = await client.registerAgent({
      id: agent_id,
      name,
      version: '1.0',
      capabilities,
      publicKey: DEV_PUBLIC_KEY,
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.tool(
  'oacp_send_task',
  'Send a task_request message and return trace_id + message_id',
  {
    from_agent: z.string(),
    capability: z.string(),
    input: z.record(z.unknown()).default({}),
    to_agent: z.string().optional(),
    trace_id: z.string().optional(),
  },
  async ({ from_agent, capability, input, to_agent, trace_id }) => {
    const messageId = crypto.randomUUID();
    const resolvedTraceId = trace_id ?? crypto.randomUUID();
    const message: Record<string, unknown> = {
      type: 'task_request',
      version: '1.0',
      message_id: messageId,
      trace_id: resolvedTraceId,
      from: from_agent,
      timestamp: new Date().toISOString(),
      capability,
      input,
      deadline_ms: 60_000,
    };
    if (to_agent !== undefined) {
      message.to = to_agent;
    }

    const result = await client.sendMessage(message);
    const consoleUrl = buildConsoleTraceUrl(client.serverUrl, resolvedTraceId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              trace_id: resolvedTraceId,
              message_id: messageId,
              console_url: consoleUrl,
              send_result: result,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  'oacp_console_url',
  'Build an OACP Console deep link for a trace_id',
  {
    trace_id: z.string(),
    mode: z.enum(['showcase', 'ops', 'legacy']).default('showcase'),
  },
  ({ trace_id, mode }) => {
    const url = buildConsoleTraceUrl(client.serverUrl, trace_id, mode);
    return Promise.resolve({
      content: [{ type: 'text', text: url }],
    });
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error('[oacp-mcp] Fatal:', error);
  process.exit(1);
});
