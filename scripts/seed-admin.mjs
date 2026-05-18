import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'resumeforgeweb@gmail.com';
  const password = 'AdminPassword123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN', // Keeping it SUPER_ADMIN just in case other parts of the DB rely on it
      status: 'APPROVED',
      provider: 'credentials',
    },
    create: {
      name: 'ResumeForge Admin',
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'APPROVED',
      provider: 'credentials',
    },
  });

  console.log(`Successfully configured admin account:`);
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
