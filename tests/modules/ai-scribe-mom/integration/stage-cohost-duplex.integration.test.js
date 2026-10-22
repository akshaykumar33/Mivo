/**
 * Module: ai-scribe-mom
 * Integration Test: POST /api/v1/ai/stage-agent & /api/v1/ai/fact-check
 * Active AI Stage Co-Host & Real-Time Duplex Voice Agent
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [ai-scribe-mom/integration] Running stage-cohost-duplex.integration.test.js...');

  // 1. Authenticate dev user
  const authRes = await (
    await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
    })
  ).json();

  if (!authRes.success || !authRes.data?.accessToken) {
    throw new Error('Authentication failed');
  }
  const token = authRes.data.accessToken;

  // 2. Test Verbal Stage Co-Host Command: "Mivo, pull up our last 3 sprint tickets and summarize blockers on screen."
  const stageAgentRes = await (
    await fetch(`${BASE_URL}/ai/stage-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: 'Mivo, pull up our last 3 sprint tickets and summarize blockers on screen.',
        roomName: 'Architecture War Room',
        attendees: ['Dev Admin', 'Sarah Connor', 'Alex Rivera', 'Elena Rostova'],
      }),
    })
  ).json();

  if (!stageAgentRes.success || !stageAgentRes.data) {
    throw new Error(`Stage agent endpoint failed: ${JSON.stringify(stageAgentRes)}`);
  }

  const { speechText, pinnedTile, engine } = stageAgentRes.data;
  if (!speechText || typeof speechText !== 'string') {
    throw new Error('Expected speechText for voice synthesis');
  }

  if (!pinnedTile || !Array.isArray(pinnedTile.tickets) || pinnedTile.tickets.length === 0) {
    throw new Error('Expected pinnedTile with sprint tickets');
  }

  console.log(`   ✅ Stage Co-Host verbal response verified (Engine: ${engine}).`);
  console.log(`      Speech: "${speechText.slice(0, 90)}..."`);
  console.log(`   ✅ Pinned sprint data tile verified (${pinnedTile.tickets.length} tickets loaded).`);

  // 3. Test Real-Time Silent Fact-Check Audit against database truth
  const factCheckRes = await (
    await fetch(`${BASE_URL}/ai/fact-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        transcriptText: 'We verified there are zero urgent bugs and Redis is completely fixed.',
        speaker: 'Carlos Mendoza',
      }),
    })
  ).json();

  if (!factCheckRes.success) {
    throw new Error('Fact-check endpoint failed');
  }

  console.log('   ✅ Real-time silent fact-check auditor endpoint verified.');

  // 4. Test Spoken Voice-to-Ticket Extraction
  const ticketExtractRes = await (
    await fetch(`${BASE_URL}/ai/extract-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        transcriptSnippet: 'Sarah, let us patch the Redis pub/sub memory leak before Friday release.',
        attendees: ['Sarah Connor', 'Dev Admin'],
      }),
    })
  ).json();

  if (!ticketExtractRes.success) {
    throw new Error('Extract ticket endpoint failed');
  }

  console.log('   ✅ Spoken voice-to-ticket intent extraction verified.');
  console.log('🎉 Active AI Stage Co-Host & Real-Time Duplex Agent integration tests passed!\n');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
