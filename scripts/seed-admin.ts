import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We must dynamically import prisma or create the client here so it picks up the env var
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env.local');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const email = 'admin@gmail.com';
  const password = 'admin';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN', 
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
  await prisma.$disconnect();
}

main().catch(console.error);
