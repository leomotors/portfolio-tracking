FROM node:22-alpine AS builder

WORKDIR /factory

RUN corepack enable

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

COPY apps/ ./apps/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@app/cron build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable
# ? Note: No Runtime Dependencies

USER node

COPY --from=builder --chown=node:node /factory/apps/cron/dist/ /app/

LABEL name="portfolio-tracking/cron"
ENV NODE_ENV=production

CMD ["node", "index.js"]
