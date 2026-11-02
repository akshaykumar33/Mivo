#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🛡️ MIVO PLATFORM — 24/7 MULTI-SERVICE KEEP-ALIVE DAEMON
 * ═══════════════════════════════════════════════════════════════════════════
 * Prevents cloud services from pausing, spinning down, or auto-suspending:
 *
 *   1. NEON DATABASE (Postgres)  — Inactivity limit: 5 min  | Ping: Every 4 min
 *   2. RENDER (Free Web Service) — Inactivity limit: 15 min | Ping: Every 10 min
 *   3. SUPABASE (S3 / Storage)   — Inactivity limit: 7 days | Ping: Every 30 min
 *   4. UPSTASH (Redis Cache)     — Inactivity limit: 30 days| Ping: Every 10 min
 *
 * Usage:
 *   node scripts/keep-alive-daemon.mjs          # Run as persistent background daemon
 *   node scripts/keep-alive-daemon.mjs --once   # Single pulse check & exit
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';

// Parse .env manually so we don't require external packages
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const isOnce = process.argv.includes('--once');

// Target URLs and Credentials
const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || '';
const RENDER_WEB_URL = process.env.RENDER_WEB_URL || '';
const NEON_DB_URL = process.env.DATABASE_URL || '';
const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const REDIS_URL = process.env.REDIS_URL || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const S3_ENDPOINT = process.env.S3_ENDPOINT || '';

// Ping intervals (in milliseconds)
const INTERVALS = {
  NEON: 4 * 60 * 1000,       // 4 mins (Neon suspends compute at 5 mins)
  RENDER: 10 * 60 * 1000,    // 10 mins (Render spins down free tier at 15 mins)
  UPSTASH: 10 * 60 * 1000,   // 10 mins (Keeps Redis pool warm, prevents 30d deactivation)
  SUPABASE: 30 * 60 * 1000,  // 30 mins (Supabase pauses projects at 7 days)
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBES
// ─────────────────────────────────────────────────────────────────────────────

async function probeRender() {
  if (!RENDER_SERVER_URL && !RENDER_WEB_URL) {
    return { ok: true, skipped: true, reason: 'RENDER_SERVER_URL not set in env' };
  }

  const results = [];
  if (RENDER_SERVER_URL) {
    const target = `${RENDER_SERVER_URL.replace(/\/$/, '')}/health/keepalive`;
    const start = Date.now();
    try {
      // Allow up to 60s for Render free instances waking up from cold-start spin-down
      const res = await fetch(target, { signal: AbortSignal.timeout(60000) });
      const latency = Date.now() - start;
      results.push({ name: 'Render Server', target, ok: res.ok, status: res.status, latency });
    } catch (err) {
      results.push({ name: 'Render Server', target, ok: false, error: err.message || String(err), latency: Date.now() - start });
    }
  }

  if (RENDER_WEB_URL) {
    const target = `${RENDER_WEB_URL.replace(/\/$/, '')}/api/health`;
    const start = Date.now();
    try {
      // Allow up to 60s for Render free instances waking up from cold-start spin-down
      const res = await fetch(target, { signal: AbortSignal.timeout(60000) });
      const latency = Date.now() - start;
      results.push({ name: 'Render Web', target, ok: res.ok, status: res.status, latency });
    } catch (err) {
      results.push({ name: 'Render Web', target, ok: false, error: err.message || String(err), latency: Date.now() - start });
    }
  }

  return { ok: results.every((r) => r.ok), details: results };
}

async function probeNeon() {
  if (!NEON_DB_URL) {
    return { ok: false, error: 'DATABASE_URL not configured' };
  }
  const start = Date.now();
  try {
    const { prisma } = await import('../packages/database/dist/index.js');
    await prisma.$queryRawUnsafe('SELECT 1');
    const latency = Date.now() - start;
    return { ok: true, latency };
  } catch (err) {
    return { ok: false, error: err.message, latency: Date.now() - start };
  }
}

async function probeUpstash() {
  const start = Date.now();

  // 1. REST Probe
  if (UPSTASH_REST_URL && UPSTASH_REST_TOKEN) {
    try {
      const res = await fetch(`${UPSTASH_REST_URL}/ping`, {
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
        signal: AbortSignal.timeout(4000),
      });
      const data = await res.json();
      if (data.result === 'PONG') {
        return { ok: true, method: 'REST', latency: Date.now() - start };
      }
    } catch (err) {
      // Fall through to TCP if available
    }
  }

  // 2. TCP Probe
  if (REDIS_URL) {
    try {
      let Redis;
      try {
        Redis = (await import('ioredis')).default;
      } catch {
        Redis = (await import('../apps/server/node_modules/ioredis/built/index.js')).default;
      }
      if (Redis) {
        const client = new Redis(REDIS_URL, { connectTimeout: 3000, maxRetriesPerRequest: 1, lazyConnect: true });
        await client.connect();
        const pong = await client.ping();
        await client.quit();
        if (pong === 'PONG') {
          return { ok: true, method: 'TCP/TLS', latency: Date.now() - start };
        }
      }
    } catch (err) {
      return { ok: false, error: err.message, latency: Date.now() - start };
    }
  }

  return { ok: false, error: 'No Upstash Redis URL configured', latency: 0 };
}

async function probeSupabaseS3() {
  const start = Date.now();

  // 1. Supabase Storage API REST Probe (resets project 7-day pause timer)
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(4000),
      });
      const latency = Date.now() - start;
      if (res.ok || res.status === 401 || res.status === 403) {
        return { ok: true, method: 'Supabase Storage API', latency };
      }
    } catch (err) {
      // Fall through
    }
  }

  // 2. S3 Gateway HTTP probe
  if (S3_ENDPOINT) {
    try {
      const s3Res = await fetch(S3_ENDPOINT, { signal: AbortSignal.timeout(4000) });
      const latency = Date.now() - start;
      return { ok: true, method: 'S3 Gateway', status: s3Res.status, latency };
    } catch (err) {
      return { ok: false, error: err.message, latency: Date.now() - start };
    }
  }

  return { ok: false, error: 'Neither Supabase URL nor S3_ENDPOINT configured', latency: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION & RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function runPulse() {
  console.log(`\n[${timestamp()}] 📡 INITIATING MULTI-SERVICE KEEP-ALIVE PULSE...`);

  const [neonRes, renderRes, redisRes, supabaseRes] = await Promise.all([
    probeNeon(),
    probeRender(),
    probeUpstash(),
    probeSupabaseS3(),
  ]);

  const neonIcon = neonRes.ok ? '🟢' : '🔴';
  const renderIcon = renderRes.skipped ? '⚪' : renderRes.ok ? '🟢' : '🔴';
  const redisIcon = redisRes.ok ? '🟢' : '🔴';
  const supabaseIcon = supabaseRes.ok ? '🟢' : '🔴';

  console.log('───────────────────────────────────────────────────────────────────');
  console.log(`  ${neonIcon} Neon PostgreSQL : ${neonRes.ok ? `ACTIVE (${neonRes.latency}ms) — 5m timeout reset` : `FAILED (${neonRes.error})`}`);
  console.log(`  ${renderIcon} Render Service  : ${renderRes.skipped ? `SKIPPED (${renderRes.reason})` : renderRes.ok ? `ACTIVE — 15m timeout reset` : `FAILED`}`);
  if (renderRes.details) {
    for (const d of renderRes.details) {
      console.log(`     • ${d.name} (${d.target}): ${d.ok ? `HTTP ${d.status} (${d.latency}ms)` : `ERROR: ${d.error}`}`);
    }
  }
  console.log(`  ${redisIcon} Upstash Redis   : ${redisRes.ok ? `ACTIVE (${redisRes.method}, ${redisRes.latency}ms)` : `FAILED (${redisRes.error})`}`);
  console.log(`  ${supabaseIcon} Supabase S3     : ${supabaseRes.ok ? `ACTIVE (${supabaseRes.method}, ${supabaseRes.latency}ms) — 7d pause reset` : `FAILED (${supabaseRes.error})`}`);
  console.log('───────────────────────────────────────────────────────────────────');

  return neonRes.ok && redisRes.ok && supabaseRes.ok;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🚀 MIVO PLATFORM — KEEP-ALIVE DAEMON INITIALIZED');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  Interval Schedules:');
  console.log(`   • Neon DB     : Every ${INTERVALS.NEON / 60000} mins  (Threshold: 5 mins auto-suspend)`);
  console.log(`   • Render      : Every ${INTERVALS.RENDER / 60000} mins (Threshold: 15 mins spin-down)`);
  console.log(`   • Upstash     : Every ${INTERVALS.UPSTASH / 60000} mins (Threshold: 30 days archive)`);
  console.log(`   • Supabase S3 : Every ${INTERVALS.SUPABASE / 60000} mins (Threshold: 7 days project pause)`);
  console.log('═══════════════════════════════════════════════════════════════════');

  if (isOnce) {
    const success = await runPulse();
    process.exit(success ? 0 : 1);
  }

  // Initial immediate pulse
  await runPulse();

  // Schedule independent timers
  setInterval(async () => {
    const res = await probeNeon();
    console.log(`[${timestamp()}] [Neon Timer (4m)] ${res.ok ? `🟢 PING OK (${res.latency}ms)` : `🔴 FAIL: ${res.error}`}`);
  }, INTERVALS.NEON);

  setInterval(async () => {
    const res = await probeRender();
    if (!res.skipped) {
      console.log(`[${timestamp()}] [Render Timer (10m)] ${res.ok ? '🟢 PING OK' : '🔴 FAIL'}`);
    }
  }, INTERVALS.RENDER);

  setInterval(async () => {
    const res = await probeUpstash();
    console.log(`[${timestamp()}] [Upstash Timer (10m)] ${res.ok ? `🟢 PING OK (${res.latency}ms)` : `🔴 FAIL: ${res.error}`}`);
  }, INTERVALS.UPSTASH);

  setInterval(async () => {
    const res = await probeSupabaseS3();
    console.log(`[${timestamp()}] [Supabase Timer (30m)] ${res.ok ? `🟢 PING OK (${res.latency}ms)` : `🔴 FAIL: ${res.error}`}`);
  }, INTERVALS.SUPABASE);

  console.log(`\n⏳ Keep-alive timers active. Press Ctrl+C to terminate.\n`);
}

main().catch((err) => {
  console.error('Fatal error in Keep-Alive daemon:', err);
  process.exit(1);
});
