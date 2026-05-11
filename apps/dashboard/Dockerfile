# syntax=docker/dockerfile:1.7
#
# Build context MUST be the monorepo root, e.g.:
#   docker build -f apps/dashboard/Dockerfile -t portfolio-dashboard .

ARG NODE_VERSION=24-alpine

# ---- Base: pnpm via corepack ----
FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# ---- Builder: install deps, build Next standalone output ----
FROM base AS builder

ENV NEXT_TELEMETRY_DISABLED=1

# Copy workspace manifests first so pnpm install caches independently from source.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/database/package.json packages/database/
COPY packages/api-client/package.json packages/api-client/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy sources.
COPY apps/dashboard apps/dashboard
COPY packages packages

RUN pnpm --filter dashboard build

# ---- Runner: minimal standalone image, non-root ----
FROM node:${NODE_VERSION} AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app
USER node

# .next/standalone preserves the monorepo layout, so server.js lives at apps/dashboard/server.js
COPY --from=builder --chown=node:node /repo/apps/dashboard/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=builder --chown=node:node /repo/apps/dashboard/public ./apps/dashboard/public

EXPOSE 3000

CMD ["node", "apps/dashboard/server.js"]
