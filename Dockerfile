# OACP v1.0 — reference server + built Console SPA (Day 51)
# syntax=docker/dockerfile:1

FROM node:20-bookworm AS build

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Workspace manifests (layer cache for dependency install)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY core/package.json ./core/
COPY server/package.json ./server/
COPY cli/package.json ./cli/
COPY examples/package.json ./examples/
COPY integrations/langchain/package.json ./integrations/langchain/
COPY sdk/typescript/package.json ./sdk/typescript/
COPY packages/ui/package.json ./packages/ui/
COPY packages/observability-client/package.json ./packages/observability-client/
COPY apps/console/package.json ./apps/console/

RUN pnpm install --frozen-lockfile

# OACP platform image — exclude MCPLab lab tree (built in separate compose stack)
COPY core ./core
COPY server ./server
COPY cli ./cli
COPY examples ./examples
COPY integrations ./integrations
COPY sdk/typescript ./sdk/typescript
COPY packages ./packages
COPY apps/console ./apps/console
COPY specs ./specs

RUN pnpm build

# -----------------------------------------------------------------------------

FROM node:20-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app /app

RUN mkdir -p /data \
  && chown -R node:node /app /data

USER node

ENV NODE_ENV=production \
  OACP_SERVER_HOST=0.0.0.0 \
  OACP_SERVER_PORT=3847 \
  OACP_MEMORY_BACKEND=sqlite \
  OACP_MEMORY_SQLITE_PATH=/data/memory.db \
  OACP_CONSOLE_DIST=/app/apps/console/dist \
  OACP_CONSOLE_STATIC=1

EXPOSE 3847

VOLUME ["/data"]

HEALTHCHECK --interval=10s --timeout=5s --start-period=45s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3847/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["tini", "--"]
CMD ["node", "server/dist/cli.js"]
