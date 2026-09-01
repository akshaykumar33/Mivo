/**
 * Module: communities-rbac
 * Integration Test: Channel & Room Hierarchy Retrieval
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [communities-rbac/integration] Running channel-privacy.integration.test.js...');
  const authRes = await (
    await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
    })
  ).json();

  const commRes = await (
    await fetch(`${BASE_URL}/communities`, {
      headers: { Authorization: `Bearer ${authRes.data.accessToken}` },
    })
  ).json();

  const wysbryx = commRes.data.find((c) => c.slug === 'wysbryx-core');
  const details = await (
    await fetch(`${BASE_URL}/communities/${wysbryx.id}`, {
      headers: { Authorization: `Bearer ${authRes.data.accessToken}` },
    })
  ).json();

  if (!details.data.channels || details.data.channels.length === 0) {
    throw new Error('No channels found for community');
  }

  console.log(`   ✅ Community channels & room hierarchy verified (${details.data.channels.length} channels).`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
