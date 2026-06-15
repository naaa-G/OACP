/** Structured log levels for OACP observability. */
export type OacpLogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_ORDER: Record<OacpLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** Correlation fields attached to OACP log entries. */
export interface OacpLogContext {
  readonly trace_id?: string;
  readonly message_id?: string;
  readonly agent_id?: string;
  readonly capability?: string;
  readonly message_type?: string;
  readonly [key: string]: unknown;
}

export interface OacpLogEntry {
  readonly level: OacpLogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly context?: OacpLogContext;
}

export interface OacpLogger {
  debug(message: string, context?: OacpLogContext): void;
  info(message: string, context?: OacpLogContext): void;
  warn(message: string, context?: OacpLogContext): void;
  error(message: string, context?: OacpLogContext): void;
  child(context: OacpLogContext): OacpLogger;
}

export interface CreateConsoleLoggerOptions {
  /** Minimum level emitted (default: `info`). */
  readonly level?: OacpLogLevel;
  /** Emit JSON lines instead of human-readable text (default: false). */
  readonly json?: boolean;
  /** Base context merged into every entry. */
  readonly context?: OacpLogContext;
  /** Output sink (default: `console.log`). */
  readonly write?: (line: string) => void;
}

function shouldLog(level: OacpLogLevel, minLevel: OacpLogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[minLevel];
}

function formatTextEntry(entry: OacpLogEntry): string {
  const parts = [`[${entry.level.toUpperCase()}]`, entry.message];
  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
  }
  return parts.join(' ');
}

/** Create a structured console logger for agents, servers, and CLI tools. */
export function createConsoleLogger(options: CreateConsoleLoggerOptions = {}): OacpLogger {
  const minLevel = options.level ?? 'info';
  const json = options.json ?? false;
  const baseContext = options.context ?? {};
  const write =
    options.write ??
    ((line: string) => {
      console.log(line);
    });

  const emit = (level: OacpLogLevel, message: string, context?: OacpLogContext): void => {
    if (!shouldLog(level, minLevel)) {
      return;
    }

    const mergedContext =
      context !== undefined || Object.keys(baseContext).length > 0
        ? { ...baseContext, ...context }
        : undefined;

    const entry: OacpLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(mergedContext !== undefined ? { context: mergedContext } : {}),
    };

    write(json ? JSON.stringify(entry) : formatTextEntry(entry));
  };

  const logger: OacpLogger = {
    debug: (message, context) => {
      emit('debug', message, context);
    },
    info: (message, context) => {
      emit('info', message, context);
    },
    warn: (message, context) => {
      emit('warn', message, context);
    },
    error: (message, context) => {
      emit('error', message, context);
    },
    child: (context) =>
      createConsoleLogger({
        level: minLevel,
        json,
        context: { ...baseContext, ...context },
        write,
      }),
  };

  return logger;
}

/** No-op logger for tests and hot paths where logging is disabled. */
export const noopLogger: OacpLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLogger,
};
