# Production Dockerfile for Mivo Real-Time Backend Server
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS builder
WORKDIR /app
RUN apk add --no-cache openssl python3 make g++

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/server ./apps/server

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mivo/database run build
RUN pnpm --filter @mivo/server run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl ffmpeg

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

EXPOSE 4000
CMD ["node", "apps/server/dist/main.js"]
