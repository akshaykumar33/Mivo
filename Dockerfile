# ==============================================================================
# Production Dockerfile for Mivo Real-Time Backend Server (@mivo/server)
# Multi-stage, non-root, hardened with dumb-init and native health check
# ==============================================================================

# Stage 1: Base runtime environment
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache dumb-init openssl ffmpeg wget curl
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++

# 1. Copy workspace configuration and dependencies manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY apps/server ./apps/server

# 2. Configure pnpm and install dependencies
RUN pnpm config set enable-pre-post-scripts true
RUN pnpm install --frozen-lockfile

# 3. Build workspace packages in correct topological order
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/mivo"
ENV DIRECT_URL="postgresql://dummy:dummy@localhost:5432/mivo"

RUN pnpm --filter @mivo/shared run build
RUN pnpm --filter @mivo/database exec prisma generate
RUN pnpm --filter @mivo/database run build
RUN pnpm --filter @mivo/server run build

# Stage 3: Production Runner (Hardened & Non-root)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Create dedicated non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mivo -u 1001 -G nodejs

# Copy runtime files with appropriate permissions
COPY --chown=mivo:nodejs --from=builder /app/package.json ./package.json
COPY --chown=mivo:nodejs --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --chown=mivo:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=mivo:nodejs --from=builder /app/packages ./packages
COPY --chown=mivo:nodejs --from=builder /app/apps/server/dist ./apps/server/dist
COPY --chown=mivo:nodejs --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --chown=mivo:nodejs --from=builder /app/apps/server/node_modules ./apps/server/node_modules

# Switch to unprivileged user
USER mivo

EXPOSE 4000

# Health check probe against the NestJS /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# dumb-init forwards SIGTERM/SIGINT signals to Node.js for graceful connection draining
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/server/dist/main.js"]
