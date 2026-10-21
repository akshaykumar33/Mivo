import { prisma } from '@mivo/database';

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TYPE "RoomCommunicationMode" ADD VALUE IF NOT EXISTS 'CANVAS'`);
  const res = await prisma.$queryRawUnsafe(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'RoomCommunicationMode'`);
  console.log('Updated DB Enums:', res);
  process.exit(0);
}

main().catch(console.error);
