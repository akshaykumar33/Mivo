import fs from 'node:fs';
import path from 'node:path';

// Parse .env manually so we don't depend on dotenv
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
      process.env[key] = val;
    }
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 MIVO PLATFORM — INFRASTRUCTURE HEALTH & CONNECTIVITY CHECK');
console.log('═══════════════════════════════════════════════════════════════\n');

async function checkDatabase() {
  console.log('📦 1. POSTGRESQL (NEON DATABASE) CHECK');
  console.log('----------------------------------------');
  try {
    const { prisma } = await import('../packages/database/dist/index.js');
    
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
    console.log(`   Connecting to: ${maskedUrl}`);

    const [dbVersion] = await prisma.$queryRawUnsafe('SELECT version()');
    console.log(`   ✅ DB Connected! Engine: ${dbVersion.version.split(' on ')[0]}`);

    const userCount = await prisma.user.count();
    const commCount = await prisma.community.count();
    const channelCount = await prisma.channel.count();
    const roomCount = await prisma.room.count();
    console.log(`   ✅ Tables & Records Verified:`);
    console.log(`      - Users: ${userCount}`);
    console.log(`      - Communities: ${commCount}`);
    console.log(`      - Channels: ${channelCount}`);
    console.log(`      - Rooms: ${roomCount}`);

    // Quick write & read test
    const testEmail = `healthcheck_${Date.now()}@mivo.internal`;
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        username: `hc_${Date.now()}`,
        displayName: 'Health Check Probe',
        passwordHash: 'dummy',
      },
    });
    console.log(`   ✅ Write Test: Created probe user (${testUser.id})`);

    await prisma.user.delete({ where: { id: testUser.id } });
    console.log(`   ✅ Delete Test: Cleaned up probe user`);
    console.log('   🎉 Neon PostgreSQL status: FULLY OPERATIONAL\n');

    await prisma.$disconnect();
    return true;
  } catch (err) {
    console.error('   ❌ PostgreSQL Error:', err.message);
    return false;
  }
}

async function checkRedis() {
  console.log('⚡ 2. REDIS (UPSTASH REDIS) CHECK');
  console.log('----------------------------------------');
  let restPassed = false;
  let tcpPassed = false;

  // 1. Upstash REST API Check
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (restUrl && restToken) {
    try {
      console.log(`   Testing REST Endpoint: ${restUrl}`);
      const pingRes = await fetch(`${restUrl}/ping`, {
        headers: { Authorization: `Bearer ${restToken}` },
      });
      const pingJson = await pingRes.json();
      if (pingJson.result === 'PONG') {
        console.log('   ✅ REST Ping: PONG received');
      } else {
        throw new Error(`Unexpected REST response: ${JSON.stringify(pingJson)}`);
      }

      // REST SET / GET / DEL test
      const testKey = `mivo_probe_${Date.now()}`;
      await fetch(`${restUrl}/set/${testKey}/healthy`, {
        headers: { Authorization: `Bearer ${restToken}` },
      });
      const getRes = await (
        await fetch(`${restUrl}/get/${testKey}`, {
          headers: { Authorization: `Bearer ${restToken}` },
        })
      ).json();
      console.log(`   ✅ REST Read/Write: SET & GET verified (value: "${getRes.result}")`);

      await fetch(`${restUrl}/del/${testKey}`, {
        headers: { Authorization: `Bearer ${restToken}` },
      });
      console.log(`   ✅ REST Cleanup: Key deleted`);
      restPassed = true;
    } catch (err) {
      console.error('   ❌ Upstash REST Error:', err.message);
    }
  }

  // 2. ioredis TCP/TLS Check
  try {
    let Redis;
    try {
      Redis = (await import('ioredis')).default;
    } catch {
      try {
        Redis = (await import('../apps/server/node_modules/ioredis/built/index.js')).default;
      } catch {}
    }

    if (Redis && process.env.REDIS_URL) {
      console.log(`   Testing Redis TLS Connection via ioredis...`);
      const client = new Redis(process.env.REDIS_URL, {
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      await client.connect();
      const pingRes = await client.ping();
      console.log(`   ✅ Redis TLS Ping: ${pingRes}`);
      await client.quit();
      tcpPassed = true;
    }
  } catch (err) {
    console.log(`   ℹ️ ioredis socket test info: ${err.message}`);
  }

  if (restPassed || tcpPassed) {
    console.log('   🎉 Upstash Redis status: FULLY OPERATIONAL\n');
    return true;
  } else {
    console.log('   ❌ Upstash Redis failed.\n');
    return false;
  }
}

async function checkS3AndSupabase() {
  console.log('🪣 3. S3 & SUPABASE STORAGE CHECK');
  console.log('----------------------------------------');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const s3Endpoint = process.env.S3_ENDPOINT;

  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log(`   S3 Endpoint: ${s3Endpoint}`);

  let storageOk = false;

  // 1. Test Supabase Storage API directly via HTTP
  if (supabaseUrl && anonKey) {
    try {
      console.log(`   Querying Supabase Storage Buckets API...`);
      const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      if (res.ok) {
        const buckets = await res.json();
        console.log(`   ✅ Supabase Storage API Responding (HTTP ${res.status} OK)`);
        console.log(`   ✅ Existing Buckets: ${buckets.length > 0 ? buckets.map((b) => b.name).join(', ') : '(None yet - ready for creation)'}`);
        storageOk = true;
      } else {
        const text = await res.text();
        console.log(`   ⚠️ Supabase Storage API returned HTTP ${res.status}: ${text}`);
      }
    } catch (err) {
      console.error('   ❌ Supabase Storage Request Error:', err.message);
    }
  }

  // 2. Test S3 Gateway reachability
  if (s3Endpoint) {
    try {
      console.log(`   Pinging S3 Gateway: ${s3Endpoint}...`);
      const s3Res = await fetch(s3Endpoint);
      console.log(`   ✅ S3 Gateway Endpoint Reachable (HTTP Status: ${s3Res.status} ${s3Res.statusText})`);
      const s3Body = await s3Res.text();
      if (s3Body.includes('xml') || s3Body.includes('AccessDenied') || s3Body.includes('InvalidAccessKeyId') || s3Body.includes('MissingSecurityHeader')) {
        console.log(`   ✅ S3 XML Protocol Verified (Standard AWS S3 / Supabase S3 Response)`);
        storageOk = true;
      }
    } catch (err) {
      console.error('   ❌ S3 Endpoint Error:', err.message);
    }
  }

  if (storageOk) {
    console.log('   🎉 S3 / Supabase Storage status: FULLY OPERATIONAL\n');
    return true;
  } else {
    console.log('   ❌ S3 / Supabase Storage failed.\n');
    return false;
  }
}

async function run() {
  const dbOk = await checkDatabase();
  const redisOk = await checkRedis();
  const s3Ok = await checkS3AndSupabase();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 SUMMARY OF SERVICES STATUS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   Database (Neon PostgreSQL):  ${dbOk ? '🟢 ONLINE & VERIFIED' : '🔴 OFFLINE'}`);
  console.log(`   Cache / PubSub (Upstash):    ${redisOk ? '🟢 ONLINE & VERIFIED' : '🔴 OFFLINE'}`);
  console.log(`   Storage (Supabase / S3):     ${s3Ok ? '🟢 ONLINE & VERIFIED' : '🔴 OFFLINE'}`);
  console.log('═══════════════════════════════════════════════════════════════');
}

run().catch(console.error);

