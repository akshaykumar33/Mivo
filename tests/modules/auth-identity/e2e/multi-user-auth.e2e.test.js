/**
 * Module: auth-identity
 * E2E Test: Multi-User Concurrent Authentication
 */

const BASE_URL = 'http://localhost:4000/api/v1';
const USERS = ['dev@mivo.app', 'alex@mivo.app', 'carlos@mivo.app', 'priya@mivo.app'];

async function run() {
  console.log('🧪 [auth-identity/e2e] Running multi-user-auth.e2e.test.js...');
  const results = await Promise.all(
    USERS.map((email) =>
      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!' }),
      }).then((r) => r.json())
    )
  );

  results.forEach((res, i) => {
    if (!res.success) throw new Error(`Auth failed for ${USERS[i]}`);
  });

  console.log(`   ✅ Concurrent authentication verified for ${USERS.length} multi-role users.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
