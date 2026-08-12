FROM node:24.19.0-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/cli/package.json packages/cli/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build

COPY . .
RUN pnpm --filter @pp/web build

FROM base AS production-dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/cli/package.json packages/cli/package.json
RUN pnpm install --prod --frozen-lockfile

FROM base AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_PATH=/data/pp.sqlite
ENV BODY_SIZE_LIMIT=2M

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build --chown=node:node /app/apps/web/build ./apps/web/build

RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 3000

CMD ["node", "apps/web/build"]
