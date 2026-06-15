export type OutputFormat = 'text' | 'json';

export interface GlobalCliOptions {
  readonly format: OutputFormat;
  readonly baseUrl?: string;
  readonly help: boolean;
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function formatDisplayValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

export function resolveBaseUrl(explicit: string | undefined): string | undefined {
  if (explicit !== undefined && explicit.length > 0) {
    return explicit.replace(/\/+$/, '');
  }
  const fromEnv = process.env.OACP_BASE_URL?.trim();
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return fromEnv.replace(/\/+$/, '');
  }
  return undefined;
}

export function printRootHelp(): void {
  console.log(`OACP CLI — multi-agent task execution from the terminal

Usage:
  oacp run <prompt>              Run the Autonomous Startup Team on a product prompt
  oacp trace <trace-id>          Show a trace timeline from a running server
  oacp trace --list              List recent traces
  oacp serve                     Start the reference HTTP server

Global options:
  -h, --help                     Show command help
  --format json|text             Output format (default: text)

Environment:
  OACP_BASE_URL                  Default server URL for trace/serve (default: http://127.0.0.1:3000)
  OACP_PORT                      Default port for oacp serve / ephemeral run (default: 3000)
  OACP_TIMEOUT_MS                Client timeout for oacp run (default: 60000)

Examples:
  oacp run "build todo app"
  oacp run "build habit tracker" --format json
  oacp run "build todo app" --keep-alive --port 3000
  oacp trace --list
  oacp serve --bootstrap startup
`);
}
