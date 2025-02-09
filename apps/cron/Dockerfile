FROM node:22-alpine AS builder

WORKDIR /factory

RUN npm install -g npm corepack
RUN corepack enable

COPY package.json pnpm-*.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install
RUN pnpm --filter=@app/cron build

FROM node:22-alpine AS runner

WORKDIR /app

USER node

COPY --from=builder --chown=node:node /factory/apps/cron/dist/ /app/

LABEL name="portfolio-tracking/cron"
ENV NODE_ENV=production

CMD ["node", "index.js"]
