# Operations Runbook (Step 3)

## Local Development, Environment Setup & Operational Runbook

---

## 1. Prerequisites
* **Node.js**: v20.x or v22.x LTS
* **PNPM**: v9.x (`npm install -g pnpm` or Corepack)
* **Docker & Docker Compose**: v24+ for local database and cache services
* **Git**: v2.40+

---

## 2. Local Environment Configuration

Create `.env` in repository root (or copy from `.env.example`):

```bash
# General
NODE_ENV=development
PORT=4000
WEB_PORT=3000

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres_dev_password@localhost:5432/mivo_dev?schema=public"

# Cache & PubSub (Redis)
REDIS_URL="redis://localhost:6379"

# Security & JWT
JWT_ACCESS_SECRET="dev_jwt_access_secret_super_secure_32chars_min"
JWT_REFRESH_SECRET="dev_jwt_refresh_secret_super_secure_32chars_min"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:3000"

# Object Storage (MinIO / S3)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET_NAME="mivo-media"
S3_REGION="us-east-1"
```

---

## 3. Starting Local Development Infrastructure

```bash
# 1. Start PostgreSQL, Redis, and MinIO via Docker Compose
docker compose -f docker/docker-compose.yml up -d

# 2. Install workspace dependencies
pnpm install

# 3. Generate Prisma client & apply database migrations
pnpm --filter @mivo/database db:migrate

# 4. Seed database with initial permissions and dev user
pnpm --filter @mivo/database db:seed

# 5. Start development servers in parallel (Next.js frontend + NestJS backend)
pnpm dev
```

---

## 4. Operational Troubleshooting

| Symptom | Probable Cause | Action |
| :--- | :--- | :--- |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL container is not running | Run `docker compose -f docker/docker-compose.yml up -d postgres` and check `docker logs mivo-postgres` |
| `ECONNREFUSED 127.0.0.1:6379` | Redis container is not running | Run `docker compose -f docker/docker-compose.yml up -d redis` |
| `PrismaClientInitializationError` | Schema out of sync with local DB | Run `pnpm --filter @mivo/database db:push` or apply migrations |
| WebSocket connection fails | JWT token expired or missing | Verify access token in Authorization header or reconnect via refresh token |

---

## 5. Verification Commands
```bash
# Typecheck entire monorepo
pnpm check:types

# Run linter
pnpm lint

# Run automated tests
pnpm test

# Build production bundles
pnpm build
```
