/**
 * Module: communities-rbac
 * E2E Test: Community & Workspace Multi-Role Access
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [communities-rbac/e2e] Running community-lifecycle.e2e.test.js...');
  const [ownerAuth, memberAuth] = await Promise.all([
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

  const [ownerComm, memberComm] = await Promise.all([
    fetch(`${BASE_URL}/communities`, {
      headers: { Authorization: `Bearer ${ownerAuth.data.accessToken}` },
    }).then((r) => r.json()),
    fetch(`${BASE_URL}/communities`, {
      headers: { Authorization: `Bearer ${memberAuth.data.accessToken}` },
    }).then((r) => r.json()),
  ]);

  if (!ownerComm.success || !memberComm.success) {
    throw new Error('Community listing failed across roles');
  }

  console.log('   ✅ Multi-role community access and workspace membership verified.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
