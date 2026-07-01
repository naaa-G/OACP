import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

/** Dev-only: MCPLab deep links use `/console/?trace_id=` (production mount path). */
function consoleDevRedirect(): {
  name: string;
  configureServer(server: { middlewares: Connect.Server }): void;
} {
  return {
    name: 'oacp-console-dev-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        const path = url.split('?')[0] ?? '';
        if (path === '/console' || path === '/console/') {
          const search = url.includes('?') ? url.slice(url.indexOf('?')) : '';
          res.writeHead(302, { Location: `/${search}` });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_OACP_API_PROXY ?? 'http://127.0.0.1:3001';
  // Playwright webServer sets CONSOLE_DEV_PORT via process.env (not .env files).
  const devPort = Number(process.env.CONSOLE_DEV_PORT ?? env.CONSOLE_DEV_PORT ?? 5173);

  return {
    plugins: [react(), consoleDevRedirect()],
    resolve: {
      // Dev: use package source so SSE fixes apply without rebuilding dist.
      alias: {
        '@oacp/observability-client': fileURLToPath(
          new URL('../../packages/observability-client/src/index.ts', import.meta.url),
        ),
      },
    },
    server: {
      host: '127.0.0.1',
      port: devPort,
      strictPort: true,
      proxy: {
        '/playground': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/v1': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      emptyOutDir: true,
    },
  };
});
