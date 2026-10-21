import { prisma } from '@mivo/database';

async function main() {
  console.log('🔄 Applying hyper-feature schema migrations...');
  
  // 1. Add CODE enum value to RoomCommunicationMode
  await prisma.$executeRawUnsafe(`ALTER TYPE "RoomCommunicationMode" ADD VALUE IF NOT EXISTS 'CODE'`);
  
  // 2. Add AI Twin fields to users table
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiTwinEnabled" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiTwinPrompt" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiTwinCallbackSlots" JSONB`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiTwinAutoCallback" BOOLEAN NOT NULL DEFAULT true`);

  const enumCheck = await prisma.$queryRawUnsafe(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'RoomCommunicationMode'`);
  console.log('✅ RoomCommunicationMode Enums:', enumCheck);

  const colCheck = await prisma.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE 'aiTwin%'`);
  console.log('✅ Users AI Twin Columns:', colCheck);

  process.exit(0);
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
