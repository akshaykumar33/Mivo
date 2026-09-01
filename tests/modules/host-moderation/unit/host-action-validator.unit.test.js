/**
 * Module: host-moderation
 * Unit Test: Host Moderation Action Payload Validator
 */

const ALLOWED_ACTIONS = ['MUTE', 'KICK', 'TRANSFER_HOST'];

function validateHostAction(payload) {
  if (!payload || !payload.roomId || !payload.targetUserId) return false;
  return ALLOWED_ACTIONS.includes(payload.action);
}

function run() {
  console.log('🧪 [host-moderation/unit] Running host-action-validator.unit.test.js...');
  if (!validateHostAction({ roomId: '1', targetUserId: 'u1', action: 'MUTE' })) throw new Error('MUTE validation failed');
  if (!validateHostAction({ roomId: '1', targetUserId: 'u1', action: 'KICK' })) throw new Error('KICK validation failed');
  if (!validateHostAction({ roomId: '1', targetUserId: 'u1', action: 'TRANSFER_HOST' })) throw new Error('TRANSFER_HOST validation failed');
  if (validateHostAction({ roomId: '1', targetUserId: 'u1', action: 'INVALID_ACTION' })) throw new Error('Allowed invalid action');

  console.log('   ✅ Host moderation payload and action validation verified.');
}

run();
