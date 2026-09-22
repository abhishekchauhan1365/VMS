FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
COPY . .
RUN pnpm --filter=@vms/api exec prisma generate
RUN pnpm --filter=@vms/shared run build && pnpm --filter=@vms/api run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/apps/api ./apps/api
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["sh", "-c", "prisma migrate deploy && node dist/server.js"]
