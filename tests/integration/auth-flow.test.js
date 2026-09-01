/**
 * Integration Test: Authentication & Session Verification Flow
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function runTests() {
  console.log('🧪 Running Integration Test: auth-flow.test.js...');

  // Test 1: Successful Login
  const successRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
  });
  const successData = await successRes.json();

  if (!successData.success || !successData.data?.accessToken) {
    throw new Error(`Valid login failed: ${JSON.stringify(successData)}`);
  }
  console.log('   ✅ Test 1: Valid credential login and JWT issuance passed.');

  // Test 2: Invalid Password Rejection
  const failRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@mivo.app', password: 'WrongPassword999!' }),
  });
  const failData = await failRes.json();

  if (failData.success || failRes.status === 200) {
    throw new Error('Expected login rejection for invalid password');
  }
  console.log('   ✅ Test 2: Invalid password rejection passed.');

  // Test 3: Authenticated Route with Token
  const meRes = await fetch(`${BASE_URL}/communities`, {
    headers: { Authorization: `Bearer ${successData.data.accessToken}` },
  });
  const meData = await meRes.json();

  if (!meData.success || !Array.isArray(meData.data)) {
    throw new Error('Authorized community listing failed');
  }
  console.log(`   ✅ Test 3: Authenticated API access verified (${meData.data.length} communities).`);

  console.log('   🎉 Auth Flow Integration Tests: 3/3 PASSED\n');
}

runTests().catch((e) => {
  console.error('❌ auth-flow.test.js failed:', e);
  process.exit(1);
});
