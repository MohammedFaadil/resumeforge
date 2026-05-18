import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env.local');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const oldEmail = 'superadmin@yourdomain.com';
  const newEmail = 'resumeforgeweb@gmail.com';

  const oldUser = await prisma.user.findUnique({ where: { email: oldEmail } });
  const newUser = await prisma.user.findUnique({ where: { email: newEmail } });

  if (!oldUser) {
    console.log(`Old user ${oldEmail} not found. Nothing to transfer.`);
    await prisma.$disconnect();
    return;
  }

  if (!newUser) {
    console.log(`New user ${newEmail} not found. Cannot transfer.`);
    await prisma.$disconnect();
    return;
  }

  // Transfer Resumes
  const resumeUpdate = await prisma.resume.updateMany({
    where: { userId: oldUser.id },
    data: { userId: newUser.id },
  });
  console.log(`Transferred ${resumeUpdate.count} resumes.`);

  // Transfer Feedbacks
  const feedbackUpdate = await prisma.feedback.updateMany({
    where: { userId: oldUser.id },
    data: { userId: newUser.id },
  });
  console.log(`Transferred ${feedbackUpdate.count} feedbacks.`);

  // Delete Old User
  await prisma.user.delete({
    where: { id: oldUser.id },
  });
  console.log(`Deleted old user ${oldEmail}.`);

  await prisma.$disconnect();
}

main().catch(console.error);
