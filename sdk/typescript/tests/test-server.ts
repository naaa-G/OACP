import { createApp } from '@oacp/server';
import type { CreateAppOptions, OacpApp } from '@oacp/server';

/** In-memory server for SDK integration tests (avoids shared `.oacp/memory.db`). */
export function createSdkTestApp(
  options: Omit<CreateAppOptions, 'config'> & { config?: CreateAppOptions['config'] } = {},
): OacpApp {
  return createApp({
    ...options,
    logger: false,
    config: {
      memoryBackend: 'memory',
      importFromMcplabOnStartup: false,
      enableConsoleStatic: false,
      apiKey: '',
      ...options.config,
    },
  });
}
