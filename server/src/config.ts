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
    ...(postgresUrl !== undefined && postgresUrl.length > 0
      ? { memoryPostgresUrl: postgresUrl }
      : {}),
  };
}
