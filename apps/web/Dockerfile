FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS dev
COPY . .
WORKDIR /repo/apps/web
EXPOSE 5173
CMD ["pnpm", "dev", "--", "--host"]
