# ==============================================================================
# Production Dockerfile for Mivo Web Frontend (@mivo/web - Next.js 15 Standalone)
# Multi-stage, minimal size (~150MB), non-root with dumb-init & health check
# ==============================================================================

# Stage 1: Base runtime environment
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache dumb-init libc6-compat wget curl
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

# Copy workspace configuration and dependencies manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Configure pnpm and install dependencies
RUN pnpm config set enable-pre-post-scripts true
RUN pnpm install --frozen-lockfile

# Dummy environment variables for Next.js build-time pre-rendering
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL="http://localhost:4000"
ENV NEXT_PUBLIC_WS_URL="http://localhost:4000"

# Build dependencies and web application
RUN pnpm --filter @mivo/shared run build
RUN pnpm --filter @mivo/ui run build
RUN pnpm --filter @mivo/web run build

# Stage 3: Production Runner (Next.js Standalone, Non-root)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache dumb-init wget curl

# Create dedicated non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy standalone output and static assets
# Next.js standalone output contains the required minimal node_modules and server.js
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/public ./apps/web/public
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Switch to unprivileged user
USER nextjs

EXPOSE 3000

# Health check probe against Next.js /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]

