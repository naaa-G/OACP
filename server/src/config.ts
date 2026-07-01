import type { CapabilityRoutingMode } from '@oacp/core';
import type { MemoryBackend } from '@oacp/core';

/** Server configuration resolved from environment with safe defaults. */
export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly requestTimeoutMs: number;
  readonly bodyLimitBytes: number;
  readonly logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  readonly capabilityRoutingMode: CapabilityRoutingMode;
  readonly memoryBackend: MemoryBackend;
  readonly memorySqlitePath: string;
  readonly memoryPostgresUrl?: string;
  /** Absolute path to built Console assets (`apps/console/dist`). */
  readonly consoleDistPath?: string;
  /** When false, skip mounting Console static files even if dist exists. */
  readonly enableConsoleStatic: boolean;
  /** Optional Redis URL for multi-instance SSE fanout (`OACP_OBSERVABILITY_REDIS_URL`). */
  readonly observabilityRedisUrl?: string;
  /** Redis pub/sub channel for observability events (default `oacp:observability:events`). */
  readonly observabilityRedisChannel?: string;
  /** Shared secret for HTTP API auth (`OACP_API_KEY`). When unset, auth is disabled. */
  readonly apiKey?: string;
  /** MCPLab export URL for startup backfill (`MCPLAB_OBSERVABILITY_EXPORT_URL`). */
  readonly mcplabExportUrl?: string;
  /** Shared secret for MCPLab sync (`MCPLAB_SYNC_SECRET`, falls back to API key). */
  readonly mcplabSyncSecret?: string;
  /** MCPLab run status webhook (`MCPLAB_TRACE_STATUS_WEBHOOK_URL`). */
  readonly mcplabStatusWebhookUrl?: string;
  /** When true, import missing traces from MCPLab on startup (`OACP_IMPORT_FROM_MCPLAB`). */
  readonly importFromMcplabOnStartup: boolean;
}

const DEFAULT_PORT = 3847;
const DEFAULT_HOST = '0.0.0.0';

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid OACP_SERVER_PORT: ${value}`);
  }
  return port;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid integer env value: ${value}`);
  }
  return parsed;
}

function parseCapabilityRoutingMode(value: string | undefined): CapabilityRoutingMode {
  if (!value || value === 'first') {
    return 'first';
  }
  if (value === 'all') {
    return 'all';
  }
  throw new Error(`Invalid OACP_CAPABILITY_ROUTING_MODE: ${value} (expected "first" or "all")`);
}

function parseMemoryBackend(value: string | undefined): MemoryBackend {
  if (!value || value === 'sqlite') {
    return 'sqlite';
  }
  if (value === 'memory' || value === 'postgres') {
    return value;
  }
  throw new Error(
    `Invalid OACP_MEMORY_BACKEND: ${value} (expected "memory", "sqlite", or "postgres")`,
  );
}

function parseBooleanEnv(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value.length === 0) {
    return fallback;
  }
  return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
}

/** Load server configuration from `OACP_SERVER_*` environment variables. */
export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const memoryBackend = parseMemoryBackend(env.OACP_MEMORY_BACKEND);
  const postgresUrl = env.OACP_MEMORY_POSTGRES_URL;

  return {
    host: env.OACP_SERVER_HOST ?? DEFAULT_HOST,
    port: parsePort(env.OACP_SERVER_PORT),
    requestTimeoutMs: parsePositiveInt(env.OACP_SERVER_REQUEST_TIMEOUT_MS, 30_000),
    bodyLimitBytes: parsePositiveInt(env.OACP_SERVER_BODY_LIMIT_BYTES, 1_048_576),
    logLevel: (env.OACP_SERVER_LOG_LEVEL as ServerConfig['logLevel'] | undefined) ?? 'info',
    capabilityRoutingMode: parseCapabilityRoutingMode(env.OACP_CAPABILITY_ROUTING_MODE),
    memoryBackend,
    memorySqlitePath: env.OACP_MEMORY_SQLITE_PATH ?? '.oacp/memory.db',
    enableConsoleStatic: env.OACP_CONSOLE_STATIC !== '0',
    ...(env.OACP_OBSERVABILITY_REDIS_URL !== undefined &&
    env.OACP_OBSERVABILITY_REDIS_URL.length > 0
      ? { observabilityRedisUrl: env.OACP_OBSERVABILITY_REDIS_URL }
      : {}),
    ...(env.OACP_OBSERVABILITY_REDIS_CHANNEL !== undefined &&
    env.OACP_OBSERVABILITY_REDIS_CHANNEL.length > 0
      ? { observabilityRedisChannel: env.OACP_OBSERVABILITY_REDIS_CHANNEL }
      : {}),
    ...(env.OACP_CONSOLE_DIST !== undefined && env.OACP_CONSOLE_DIST.length > 0
      ? { consoleDistPath: env.OACP_CONSOLE_DIST }
      : {}),
    ...(postgresUrl !== undefined && postgresUrl.length > 0
      ? { memoryPostgresUrl: postgresUrl }
      : {}),
    ...(env.OACP_API_KEY !== undefined && env.OACP_API_KEY.trim().length > 0
      ? { apiKey: env.OACP_API_KEY.trim() }
      : {}),
    importFromMcplabOnStartup: parseBooleanEnv(env.OACP_IMPORT_FROM_MCPLAB),
    ...(env.MCPLAB_OBSERVABILITY_EXPORT_URL !== undefined &&
    env.MCPLAB_OBSERVABILITY_EXPORT_URL.length > 0
      ? { mcplabExportUrl: env.MCPLAB_OBSERVABILITY_EXPORT_URL }
      : {}),
    ...(env.MCPLAB_SYNC_SECRET !== undefined && env.MCPLAB_SYNC_SECRET.length > 0
      ? { mcplabSyncSecret: env.MCPLAB_SYNC_SECRET }
      : {}),
    ...(env.MCPLAB_TRACE_STATUS_WEBHOOK_URL !== undefined &&
    env.MCPLAB_TRACE_STATUS_WEBHOOK_URL.length > 0
      ? { mcplabStatusWebhookUrl: env.MCPLAB_TRACE_STATUS_WEBHOOK_URL }
      : {}),
  };
}
