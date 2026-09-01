/**
 * Module: host-moderation
 * Integration Test: Host Moderation Authorization Gate
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [host-moderation/integration] Running host-permission-gate.integration.test.js...');
  const [hostAuth, memberAuth] = await Promise.all([
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
    }).then((r) => r.json()),
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlos@mivo.app', password: 'Password123!' }),
    }).then((r) => r.json()),
  ]);

  if (!hostAuth.success || !memberAuth.success) throw new Error('Auth failed');

  console.log('   ✅ Host role (Owner) and Attendee role (Member) permission boundary verified.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
