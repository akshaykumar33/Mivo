/**
 * Module: auth-identity
 * Unit Test: Password Hashing & Salt Verification
 */

import crypto from 'crypto';

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, salt, expectedHash) {
  const hash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}

function run() {
  console.log('🧪 [auth-identity/unit] Running password-hash.unit.test.js...');
  const salt = crypto.randomBytes(16).toString('hex');
  const password = 'Password123!';
  const hash = hashPassword(password, salt);

  const isValid = verifyPassword(password, salt, hash);
  if (!isValid) throw new Error('Password hash verification failed');

  const isInvalid = verifyPassword('WrongPassword!', salt, hash);
  if (isInvalid) throw new Error('Accepted invalid password');

  console.log('   ✅ Cryptographic password hashing and timing-safe verification verified.');
}

run();
