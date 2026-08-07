import { PrismaClient } from '@prisma/client'

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL
  console.log("PRISMA INIT. DATABASE_URL:", connectionString ? "DEFINED" : "UNDEFINED", connectionString?.substring(0, 15) + "...");
  const pool = new Pool({ 
    connectionString,
    max: 2, // Prevent Supabase connection exhaustion in dev
    ssl: { rejectUnauthorized: false } // Force SSL to prevent connection rejection
  })
  const adapter = new PrismaPg(pool)
  const client = new PrismaClient({ adapter })

  // Auto-seed/ensure mock user exists in the database
  setTimeout(async () => {
    try {
      const email = "admin@gmail.com";
      const existing = await client.user.findUnique({ where: { email } });
      if (!existing) {
        console.log("Auto-creating mock admin user in database...");
        await client.user.create({
          data: {
            id: "mock-admin-id",
            name: "Admin User",
            email: email,
            role: "SUPER_ADMIN",
            status: "APPROVED",
            provider: "credentials",
          }
        });
        console.log("Mock admin user created.");
      } else if (existing.role !== "SUPER_ADMIN" || existing.status !== "APPROVED") {
        console.log("Upgrading existing admin user to SUPER_ADMIN...");
        await client.user.update({
          where: { email },
          data: {
            role: "SUPER_ADMIN",
            status: "APPROVED",
          }
        });
      }
    } catch (err) {
      console.error("Failed to seed mock user in Prisma initialization:", err);
    }
  }, 1000);

  return client
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

