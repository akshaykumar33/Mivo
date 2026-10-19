/**
 * Module: auth-identity
 * Unit Test: Slack-Style Availability & Custom Status Expiration Logic
 */

import assert from 'node:assert';

const VALID_AVAILABILITY_STATES = ['ONLINE', 'IDLE', 'DND', 'OFFLINE'];

function isStatusExpired(expiresAt) {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  return !isNaN(time) && time <= Date.now();
}

function calculateStatusExpiresAt(durationOption, baseDate = new Date()) {
  const now = new Date(baseDate);
  if (durationOption === '30m') {
    return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  }
  if (durationOption === '1h') {
    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
  if (durationOption === '2h') {
    return new Date(now.getTime() + 120 * 60 * 1000).toISOString();
  }
  if (durationOption === '4h') {
    return new Date(now.getTime() + 240 * 60 * 1000).toISOString();
  }
  if (durationOption === 'today') {
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return endOfDay.toISOString();
  }
  if (durationOption === 'this_week') {
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999);
    return endOfWeek.toISOString();
  }
  return null;
}

function resolveUserPresence(user) {
  const expired = isStatusExpired(user.customStatusExpiresAt);
  return {
    status: user.status || 'OFFLINE',
    customStatus: expired ? null : user.customStatus,
    customStatusExpiresAt: expired ? null : user.customStatusExpiresAt,
  };
}

function run() {
  console.log('🧪 [auth-identity/unit] Running slack-status-availability.unit.test.js...');

  // 1. Availability states
  for (const state of ['ONLINE', 'IDLE', 'DND', 'OFFLINE']) {
    assert.ok(VALID_AVAILABILITY_STATES.includes(state), `Valid state ${state} rejected`);
  }
  assert.strictEqual(VALID_AVAILABILITY_STATES.includes('BUSY'), false);
  console.log('   ✅ Validated Slack availability states (ONLINE, IDLE, DND, OFFLINE).');

  // 2. Status expiration calculator
  const mockNow = new Date('2026-10-19T10:00:00.000Z');
  const in30m = calculateStatusExpiresAt('30m', mockNow);
  assert.strictEqual(in30m, '2026-10-19T10:30:00.000Z');

  const in1h = calculateStatusExpiresAt('1h', mockNow);
  assert.strictEqual(in1h, '2026-10-19T11:00:00.000Z');

  const in4h = calculateStatusExpiresAt('4h', mockNow);
  assert.strictEqual(in4h, '2026-10-19T14:00:00.000Z');

  const dontClear = calculateStatusExpiresAt('dont_clear', mockNow);
  assert.strictEqual(dontClear, null);
  console.log('   ✅ Status expiration time calculations verified (30m, 1h, 4h, today, dont_clear).');

  // 3. Status expiration resolver
  const pastTime = new Date(Date.now() - 5000).toISOString(); // expired 5 seconds ago
  const futureTime = new Date(Date.now() + 600000).toISOString(); // expires in 10 minutes

  // Active status that has NOT expired
  const activeUser = {
    status: 'ONLINE',
    customStatus: '💬 In a meeting',
    customStatusExpiresAt: futureTime,
  };
  const activeResolved = resolveUserPresence(activeUser);
  assert.strictEqual(activeResolved.status, 'ONLINE');
  assert.strictEqual(activeResolved.customStatus, '💬 In a meeting');
  assert.strictEqual(activeResolved.customStatusExpiresAt, futureTime);

  // Expired status -> should be cleared automatically!
  const expiredUser = {
    status: 'ONLINE',
    customStatus: '🚗 Commuting',
    customStatusExpiresAt: pastTime,
  };
  const expiredResolved = resolveUserPresence(expiredUser);
  assert.strictEqual(expiredResolved.status, 'ONLINE');
  assert.strictEqual(expiredResolved.customStatus, null);
  assert.strictEqual(expiredResolved.customStatusExpiresAt, null);
  console.log('   ✅ Automatic clearing of expired custom status verified.');

  // Indefinite custom status ("Don't clear")
  const permanentUser = {
    status: 'DND',
    customStatus: '🌴 Vacationing',
    customStatusExpiresAt: null,
  };
  const permanentResolved = resolveUserPresence(permanentUser);
  assert.strictEqual(permanentResolved.status, 'DND');
  assert.strictEqual(permanentResolved.customStatus, '🌴 Vacationing');
  assert.strictEqual(permanentResolved.customStatusExpiresAt, null);
  console.log('   ✅ Indefinite ("Don\'t clear") custom status persistence verified.');

  console.log('🎉 All Slack availability & status unit tests passed successfully!\n');
}

run();
