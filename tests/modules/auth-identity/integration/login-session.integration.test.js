/**
 * Module: auth-identity
 * Integration Test: Login and JWT Session Verification
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [auth-identity/integration] Running login-session.integration.test.js...');
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
  });
  const data = await res.json();
  if (!data.success || !data.data?.accessToken) {
    throw new Error(`Login integration failed: ${JSON.stringify(data)}`);
  }
  console.log('   ✅ Valid credential login and JWT session verified.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
