import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.DATABASE_URL = "postgresql://postgres:internaluser%4012345@db.naudbybidjrlykuyrjox.supabase.co:5432/postgres";
const prisma = require("../src/lib/prisma").default;

async function main() {
  try {
    const user = await prisma.user.findFirst();
    console.log("DB connected successfully!", user?.email);
  } catch (error) {
    console.error("DB connection error:", error);
  } finally {
    process.exit(0);
  }
}
main();
