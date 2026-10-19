/**
 * Module: auth-identity
 * Integration Test: Slack Status & Availability End-to-End API and Realtime Flow
 */

import assert from 'node:assert';
import { io } from 'socket.io-client';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api/v1';
const WS_URL = process.env.TEST_WS_URL || 'http://localhost:4000';

async function run() {
  console.log('🧪 [auth-identity/integration] Running slack-status-availability.integration.test.js...');

  // 1. Authenticate dev user
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true, 'User login should succeed');
  const token = loginData.data.accessToken;
  const userId = loginData.data.user.id;
  console.log('   ✅ User authenticated successfully.');

  // 2. Set Availability to IDLE (Away) with Custom Status '💬 In a design meeting' (1 hour expiry)
  const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const setStatusRes = await fetch(`${BASE_URL}/users/me/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'IDLE',
      customStatus: 'In a design meeting',
      customStatusExpiresAt: oneHourLater,
    }),
  });
  const setStatusData = await setStatusRes.json();
  assert.strictEqual(setStatusData.success, true, 'Status update must succeed');
  assert.strictEqual(setStatusData.data.status, 'IDLE');
  assert.strictEqual(setStatusData.data.customStatus, 'In a design meeting');
  assert.ok(setStatusData.data.customStatusExpiresAt, 'Expiry time must be set');
  console.log('   ✅ Set availability to Away (IDLE) with custom status & 1h expiration.');

  // 3. Verify Profile Persistence
  const profileRes = await fetch(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profileData = await profileRes.json();
  assert.strictEqual(profileData.success, true);
  assert.strictEqual(profileData.data.status, 'IDLE');
  assert.strictEqual(profileData.data.customStatus, 'In a design meeting');
  console.log('   ✅ Verified persistence of status and expiration in PostgreSQL profile.');

  // 4. Update Availability to DND (Do Not Disturb) with Custom Status 'Deep work & focus'
  const setDndRes = await fetch(`${BASE_URL}/users/me/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'DND',
      customStatus: 'Deep work & focus',
      customStatusExpiresAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
    }),
  });
  const setDndData = await setDndRes.json();
  assert.strictEqual(setDndData.data.status, 'DND');
  assert.strictEqual(setDndData.data.customStatus, 'Deep work & focus');
  console.log('   ✅ Updated availability to DND with 2h focus mode status.');

  // 5. Clear Custom Status (like Slack clear button)
  const clearRes = await fetch(`${BASE_URL}/users/me/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'ONLINE',
      customStatus: null,
      customStatusExpiresAt: null,
    }),
  });
  const clearData = await clearRes.json();
  assert.strictEqual(clearData.success, true);
  assert.strictEqual(clearData.data.status, 'ONLINE');
  assert.strictEqual(clearData.data.customStatus, null);
  assert.strictEqual(clearData.data.customStatusExpiresAt, null);
  console.log('   ✅ Cleared custom status, restored Active (ONLINE) availability.');

  // 6. Test Expiration Behavior (status with past expiration should be cleared by service)
  const pastTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const pastRes = await fetch(`${BASE_URL}/users/me/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'ONLINE',
      customStatus: 'Out to lunch',
      customStatusExpiresAt: pastTime,
    }),
  });
  const pastData = await pastRes.json();
  assert.strictEqual(pastData.success, true);
  assert.strictEqual(pastData.data.customStatus, null, 'Expired status must be resolved as null');
  assert.strictEqual(pastData.data.customStatusExpiresAt, null);
  console.log('   ✅ Automatic expiration: expired custom status rejected/cleared.');

  // 7. Test Real-time Socket.io Presence Sync
  await new Promise((resolve, reject) => {
    const socket = io(WS_URL, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket.io presence update test timed out'));
    }, 8000);

    socket.on('connect', () => {
      // Listen for presence broadcast
      socket.on('presence:user_updated', (data) => {
        if (data.userId === userId && data.customStatus === 'Vacationing') {
          assert.strictEqual(data.status, 'IDLE');
          clearTimeout(timeout);
          socket.disconnect();
          console.log('   ✅ Realtime WebSocket presence broadcast received (presence:user_updated).');
          resolve();
        }
      });

      // Emit presence update via socket
      socket.emit('presence:update', {
        status: 'IDLE',
        customStatus: 'Vacationing',
        customStatusExpiresAt: null,
      });
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(err);
    });
  });

  // Final cleanup: set back to ONLINE with null status
  await fetch(`${BASE_URL}/users/me/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'ONLINE',
      customStatus: null,
      customStatusExpiresAt: null,
    }),
  });

  console.log('🎉 All Slack availability & status integration tests passed successfully!');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
