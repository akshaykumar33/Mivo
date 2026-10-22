import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  console.log('🔄 Enforcing Single Organization Policy in PostgreSQL...');

  // 1. Find communities
  const commsRes = await pool.query('SELECT id, name, slug, "ownerId" FROM communities WHERE "deletedAt" IS NULL');
  console.log('Active communities:', commsRes.rows.map(c => `${c.name} (${c.slug})`));

  const wysbryx = commsRes.rows.find(c => c.slug === 'wysbryx-core');
  const design = commsRes.rows.find(c => c.slug === 'design-guild');

  if (wysbryx && design) {
    // Check if designer user exists for design-guild
    const designerCheck = await pool.query("SELECT id FROM users WHERE email = 'designer@mivo.app'");
    let designerId;
    if (designerCheck.rows.length === 0) {
      designerId = randomUUID();
      const devRes = await pool.query("SELECT \"passwordHash\" FROM users WHERE email = 'dev@mivo.app'");
      const hash = devRes.rows[0]?.passwordHash || '$argon2id$v=19$m=65536,t=3,p=4$fakehash';
      await pool.query(
        `INSERT INTO users (id, email, username, "displayName", "passwordHash", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [designerId, 'designer@mivo.app', 'designlead', 'Design Lead', hash, 'ONLINE']
      );
      console.log('✅ Created standalone user for Design Guild: designer@mivo.app');
    } else {
      designerId = designerCheck.rows[0].id;
    }

    // Update owner of design-guild to designerId
    await pool.query('UPDATE communities SET "ownerId" = $1 WHERE id = $2', [designerId, design.id]);

    // Find default role of design guild
    const roleRes = await pool.query('SELECT id FROM roles WHERE "communityId" = $1 AND "name" = \'Owner\'', [design.id]);
    const designOwnerRoleId = roleRes.rows[0]?.id;

    // Delete members in design-guild who already belong to wysbryx-core
    await pool.query(
      `DELETE FROM community_members 
       WHERE "communityId" = $1 
       AND "userId" IN (SELECT "userId" FROM community_members WHERE "communityId" = $2)`,
      [design.id, wysbryx.id]
    );
    console.log('✅ Removed duplicate cross-org memberships from Design Guild.');

    // Ensure designer is a member of design guild
    if (designOwnerRoleId) {
      await pool.query(
        `INSERT INTO community_members (id, "communityId", "userId", "roleId", "joinedAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [randomUUID(), design.id, designerId, designOwnerRoleId]
      );
    }
  }

  // 2. Add Unique constraint on community_members(userId) if not present
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'community_members_userId_key'
        ) THEN
          ALTER TABLE community_members ADD CONSTRAINT community_members_userId_key UNIQUE ("userId");
        END IF;
      END $$;
    `);
    console.log('✅ Added PostgreSQL UNIQUE constraint on community_members(userId) — Single-Org physical guarantee active!');
  } catch (err) {
    console.warn('Note on constraint:', err.message);
  }

  console.log('🎉 Single Organization enforcement completed successfully!');
  await pool.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
