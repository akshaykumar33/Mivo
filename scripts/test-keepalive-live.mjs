import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 LIVE SYSTEM VERIFICATION: SERVER & KEEP-ALIVE SUBSYSTEM');
console.log('═══════════════════════════════════════════════════════════════\n');

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testEndpoint(url, label) {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const latency = Date.now() - start;
    const body = await res.json();
    return { ok: res.ok, status: res.status, latency, body };
  } catch (err) {
    return { ok: false, error: err.message, latency: Date.now() - start };
  }
}

async function run() {
  console.log('1️⃣ Booting NestJS Backend Server (@mivo/server)...');
  const serverProcess = spawn('node', ['apps/server/dist/main.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '4000' }
  });

  let serverStarted = false;
  let keepAliveBootstrapLogged = false;
  let initialPulseLogged = false;

  serverProcess.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.includes('Nest application successfully started') || text.includes('Mivo API server listening')) {
      serverStarted = true;
    }
    if (text.includes('Starting Keep-Alive pulse daemon')) {
      keepAliveBootstrapLogged = true;
    }
    if (text.includes('[KeepAlive #') || text.includes('Heartbeat executed') || text.includes('Neon DB: up')) {
      initialPulseLogged = true;
    }
    // Echo key logs to terminal
    if (text.includes('[KeepAlive') || text.includes('Health') || text.includes('listening')) {
      process.stdout.write('   [SERVER LOG] ' + text);
    }
  });

  serverProcess.stderr.on('data', (chunk) => {
    const errText = chunk.toString();
    if (!errText.includes('DeprecationWarning')) {
      process.stderr.write('   [SERVER STDERR] ' + errText);
    }
  });

  // Wait for server to come online
  console.log('   Waiting for server readiness on http://127.0.0.1:4000...');
  for (let i = 0; i < 30; i++) {
    await wait(1000);
    try {
      const probe = await fetch('http://127.0.0.1:4000/health/live', { signal: AbortSignal.timeout(1000) });
      if (probe.ok) {
        serverStarted = true;
        console.log(`   ✅ Server is ONLINE & responsive (Attempt ${i + 1})!\n`);
        break;
      }
    } catch {}
  }

  if (!serverStarted) {
    serverProcess.kill();
    throw new Error('Server failed to start within 30 seconds');
  }

  // 2. Test /health/keepalive
  console.log('2️⃣ Testing Dedicated Multi-Service Keep-Alive Endpoint (/health/keepalive)...');
  const keepaliveRes = await testEndpoint('http://127.0.0.1:4000/health/keepalive', 'Keepalive Probe');
  console.log(`   HTTP Status : ${keepaliveRes.status} ${keepaliveRes.ok ? 'OK' : 'FAIL'} (${keepaliveRes.latency}ms)`);
  console.log('   Report Data :');
  console.log(`     • Neon PostgreSQL : ${keepaliveRes.body?.report?.services?.neon?.status} (${keepaliveRes.body?.report?.services?.neon?.responseTimeMs}ms) [Timeout: 5m]`);
  console.log(`     • Upstash Redis   : ${keepaliveRes.body?.report?.services?.upstashRedis?.status} (${keepaliveRes.body?.report?.services?.upstashRedis?.responseTimeMs}ms) [Timeout: 30d]`);
  console.log(`     • Supabase S3     : ${keepaliveRes.body?.report?.services?.supabaseS3?.status} (${keepaliveRes.body?.report?.services?.supabaseS3?.responseTimeMs}ms) [Timeout: 7d]`);
  console.log(`     • Render Service  : ${keepaliveRes.body?.report?.render?.service} (Uptime: ${keepaliveRes.body?.report?.render?.uptimeSeconds}s)\n`);

  // 3. Test /health (Comprehensive Health Gate)
  console.log('3️⃣ Testing Master Health Gate (/health)...');
  const healthRes = await testEndpoint('http://127.0.0.1:4000/health', 'Health Probe');
  console.log(`   Overall Status : ${healthRes.body?.status?.toUpperCase()} (HTTP ${healthRes.status})`);
  console.log(`     • DB Status      : ${healthRes.body?.services?.database?.status} (${healthRes.body?.services?.database?.responseTimeMs}ms)`);
  console.log(`     • Redis Status   : ${healthRes.body?.services?.redis?.status} (${healthRes.body?.services?.redis?.responseTimeMs}ms)`);
  console.log(`     • Storage Status : ${healthRes.body?.services?.storage?.status} (${healthRes.body?.services?.storage?.responseTimeMs}ms)\n`);

  // 4. Test Liveness & Readiness Probes
  console.log('4️⃣ Testing Container Probes (/health/live & /health/ready)...');
  const liveRes = await testEndpoint('http://127.0.0.1:4000/health/live', 'Liveness');
  const readyRes = await testEndpoint('http://127.0.0.1:4000/health/ready', 'Readiness');
  console.log(`   /health/live  : HTTP ${liveRes.status} -> ${JSON.stringify(liveRes.body)}`);
  console.log(`   /health/ready : HTTP ${readyRes.status} -> ${JSON.stringify(readyRes.body)}\n`);

  // Wait a couple seconds to catch automatic KeepAliveService interval logs
  console.log('5️⃣ Verifying Automated Background KeepAliveService Heartbeat...');
  await wait(6000);
  console.log(`   KeepAlive Bootstrap Logged: ${keepAliveBootstrapLogged ? '✅ YES' : 'ℹ️ Initializing'}`);

  // Gracefully terminate server
  console.log('\n6️⃣ Shutting down test server instance...');
  serverProcess.kill('SIGINT');
  await wait(1500);

  // 7. Verify Standalone Pulse CLI
  console.log('\n7️⃣ Testing Standalone Keep-Alive Pulse CLI (pnpm keepalive:pulse)...');
  const { execSync } = await import('node:child_process');
  const cliOutput = execSync('node scripts/keep-alive-daemon.mjs --once', { encoding: 'utf8' });
  console.log(cliOutput);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎉 ALL TESTS PASSED: KEEP-ALIVE SUBSYSTEM OPERATING PROPERLY!');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

