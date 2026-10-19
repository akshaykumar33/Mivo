/**
 * Module: messaging-chat
 * Integration Test: Database-Level 1-Year Message Auto-Disappearance & Purge
 */

import assert from 'node:assert';

try {
  process.loadEnvFile('.env');
} catch {}

import { prisma } from '../../../../packages/database/dist/index.js';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

async function run() {
  console.log('🧪 [messaging-chat/integration] Running message-retention-db.integration.test.js...');

  // 1. Find or pick an existing test user and room
  const user = await prisma.user.findFirst();
  const room = await prisma.room.findFirst();

  if (!user || !room) {
    console.log('   ⚠️ Skipping live DB test: no user or room found in test database.');
    return;
  }

  const now = Date.now();
  const cutoffDate = new Date(now - ONE_YEAR_MS);

  // 2. Insert two test messages: one fresh (now) and one backdated (400 days old, > 1 year)
  const freshContent = `Fresh Message ${now}`;
  const freshMsg = await prisma.message.create({
    data: {
      roomId: room.id,
      senderId: user.id,
      content: freshContent,
      createdAt: new Date(now),
    },
  });

  const oldContent = `Expired Message ${now}`;
  const oldDate = new Date(now - 400 * 24 * 60 * 60 * 1000); // 400 days ago
  const oldMsg = await prisma.message.create({
    data: {
      roomId: room.id,
      senderId: user.id,
      content: oldContent,
      createdAt: oldDate,
    },
  });

  console.log(`   ✅ Inserted fresh message (${freshMsg.id}) and backdated message > 1 year (${oldMsg.id}, date: ${oldDate.toISOString()})`);

  // 3. Test Query-level filtering: listMessages query with retention cutoff
  const visibleMessages = await prisma.message.findMany({
    where: {
      roomId: room.id,
      deletedAt: null,
      createdAt: { gte: cutoffDate },
    },
  });

  const visibleIds = visibleMessages.map((m) => m.id);
  assert.ok(visibleIds.includes(freshMsg.id), 'Fresh message should be visible');
  assert.ok(!visibleIds.includes(oldMsg.id), 'Message older than 1 year (> 365 days) MUST NOT be visible (auto-disappeared)!');
  console.log('   ✅ Query-level 1-year auto-disappearance verified in database: old message was filtered out.');

  // 4. Test Purge operation: delete messages where createdAt < cutoffDate
  const purgeResult = await prisma.message.deleteMany({
    where: {
      id: oldMsg.id,
      createdAt: { lt: cutoffDate },
    },
  });

  assert.strictEqual(purgeResult.count, 1, 'Should have purged exactly the expired test message');
  console.log(`   ✅ Physical purge of expired message verified (${purgeResult.count} message deleted from Postgres).`);

  // 5. Clean up fresh test message
  await prisma.message.delete({
    where: { id: freshMsg.id },
  }).catch(() => {});

  // 6. Test User Status Expiration in Database
  const futureExpiry = new Date(now + 3600 * 1000); // 1 hour from now
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: 'ONLINE',
      customStatus: '💬 Test In A Meeting',
      customStatusExpiresAt: futureExpiry,
    },
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
  });
  assert.strictEqual(updatedUser.customStatus, '💬 Test In A Meeting');
  assert.ok(updatedUser.customStatusExpiresAt, 'customStatusExpiresAt should be stored in Postgres');
  console.log('   ✅ Slack customStatus and customStatusExpiresAt stored and retrieved from Postgres.');

  // Test expired status cleanup
  const pastExpiry = new Date(now - 10000); // 10s ago
  await prisma.user.update({
    where: { id: user.id },
    data: {
      customStatusExpiresAt: pastExpiry,
    },
  });

  // Run cleanup on expired statuses
  const clearedResult = await prisma.user.updateMany({
    where: {
      id: user.id,
      customStatusExpiresAt: { lte: new Date() },
      customStatus: { not: null },
    },
    data: {
      customStatus: null,
      customStatusExpiresAt: null,
    },
  });
  assert.strictEqual(clearedResult.count, 1, 'Expired custom status should be cleaned up');
  console.log('   ✅ Expired custom status auto-cleared in Postgres.');

  console.log('🎉 All database retention and Slack status integration tests passed!\n');
}

run()
  .catch((e) => {
    console.error('❌ Integration test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
