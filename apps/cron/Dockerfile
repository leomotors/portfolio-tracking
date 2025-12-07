FROM node:24-alpine AS base

WORKDIR /app

RUN corepack enable

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

COPY apps/ ./apps/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@app/cron build


FROM node:24-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY tools/ ./tools/
COPY apps/cron/package.json ./
RUN node tools/patch-pkg.js
RUN pnpm install --production

COPY --from=base --chown=node:node /app/apps/cron/dist/ ./dist/
COPY --chown=node:node apps/cron/data/ ./data/

ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
