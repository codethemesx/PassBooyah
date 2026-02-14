
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const password = process.argv[2] || 'admin123'; // Pass password as arg or default
  
  if (!password) {
      console.error('Usage: npx tsx scripts/seed-user.ts <password>');
      process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword },
    create: {
      email,
      password: hashedPassword,
      name: 'Admin',
      role: 'admin'
    }
  });

  console.log(`✅ Admin user created/updated: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
