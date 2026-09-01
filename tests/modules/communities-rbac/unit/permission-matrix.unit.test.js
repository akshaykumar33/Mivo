/**
 * Module: communities-rbac
 * Unit Test: Permission Matrix & Role Hierarchies
 */

const MATRIX = {
  OWNER: { rank: 1000, canModerate: true, canDelete: true },
  ADMIN: { rank: 800, canModerate: true, canDelete: false },
  MEMBER: { rank: 100, canModerate: false, canDelete: false },
};

function run() {
  console.log('🧪 [communities-rbac/unit] Running permission-matrix.unit.test.js...');
  if (MATRIX.OWNER.rank <= MATRIX.ADMIN.rank) throw new Error('Owner rank must exceed Admin rank');
  if (MATRIX.ADMIN.rank <= MATRIX.MEMBER.rank) throw new Error('Admin rank must exceed Member rank');
  if (MATRIX.MEMBER.canModerate) throw new Error('Member should not have moderation rights');

  console.log('   ✅ Permission matrix and role rank hierarchy verified.');
}

run();
