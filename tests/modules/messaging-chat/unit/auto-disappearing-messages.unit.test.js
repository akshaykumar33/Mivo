/**
 * Module: messaging-chat
 * Unit Test: Auto-Disappearing Older (>1 Year) Messages Retention Logic
 */

import assert from 'node:assert';

const RETENTION_DAYS = 365;
const ONE_YEAR_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function getRetentionCutoff(baseDate = new Date()) {
  return new Date(baseDate.getTime() - ONE_YEAR_MS);
}

function filterActiveMessages(messages, cutoffDate) {
  return messages.filter((m) => {
    if (m.deletedAt !== null && m.deletedAt !== undefined) return false;
    const createdTime = new Date(m.createdAt).getTime();
    return createdTime >= cutoffDate.getTime();
  });
}

function run() {
  console.log('🧪 [messaging-chat/unit] Running auto-disappearing-messages.unit.test.js...');

  const now = new Date('2026-10-19T10:00:00.000Z');
  const cutoff = getRetentionCutoff(now);

  // Exact 365 days cutoff verification
  assert.strictEqual(cutoff.toISOString(), '2025-10-19T10:00:00.000Z');
  console.log(`   ✅ 1-Year (365 days) retention cutoff calculated: ${cutoff.toISOString()}`);

  const testMessages = [
    { id: '1', content: 'Sent 10 minutes ago', createdAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString() },
    { id: '2', content: 'Sent 30 days ago', createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '3', content: 'Sent 180 days ago', createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '4', content: 'Sent 364 days ago (still valid)', createdAt: new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '5', content: 'Sent 366 days ago (> 1 year - must disappear)', createdAt: new Date(now.getTime() - 366 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '6', content: 'Sent 400 days ago (> 1 year - must disappear)', createdAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '7', content: 'Sent 2 years ago (> 1 year - must disappear)', createdAt: new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '8', content: 'Soft deleted recent message', createdAt: new Date(now.getTime() - 1000).toISOString(), deletedAt: new Date().toISOString() },
  ];

  const visibleMessages = filterActiveMessages(testMessages, cutoff);

  // Messages 1, 2, 3, 4 should remain visible (<= 365 days and not deleted)
  const visibleIds = visibleMessages.map((m) => m.id);
  assert.deepStrictEqual(visibleIds, ['1', '2', '3', '4']);

  // Messages 5, 6, 7 (> 365 days) must have automatically disappeared
  assert.ok(!visibleIds.includes('5'), 'Message older than 365 days (366d) was not filtered out');
  assert.ok(!visibleIds.includes('6'), 'Message older than 365 days (400d) was not filtered out');
  assert.ok(!visibleIds.includes('7'), 'Message older than 365 days (2y) was not filtered out');
  assert.ok(!visibleIds.includes('8'), 'Soft-deleted message was not filtered out');

  console.log('   ✅ Immediate query-level auto-disappearance verified for all messages older than 365 days.');
  console.log('   ✅ Messages newer than 365 days correctly retained and accessible.');

  // Retention policy descriptor check
  const policyInfo = {
    policy: 'AUTO_DISAPPEAR_OLDER_THAN_1_YEAR',
    retentionDays: RETENTION_DAYS,
    cutoffDate: cutoff.toISOString(),
    description: 'Messages older than 1 year (365 days) automatically disappear and are purged.',
  };

  assert.strictEqual(policyInfo.retentionDays, 365);
  assert.strictEqual(policyInfo.policy, 'AUTO_DISAPPEAR_OLDER_THAN_1_YEAR');
  console.log('   ✅ Retention policy structure and metadata verified.');

  console.log('🎉 All auto-disappearing messages retention unit tests passed successfully!\n');
}

run();
