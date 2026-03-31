import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    const hashedPassword = await bcrypt.hash('01223715643', 10);

    // Create admin account (tk)
    const admin = await prisma.user.upsert({
      where: { email: 'tk@admin.com' },
      update: {},
      create: {
        email: 'tk@admin.com',
        name: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Create student account (tk2)
    const student = await prisma.user.upsert({
      where: { email: 'tk2@admin.com' },
      update: {},
      create: {
        email: 'tk2@admin.com',
        name: 'admin2',
        password: hashedPassword,
        role: 'STUDENT',
        isActive: true,
      },
    });

    console.log('✅ Test accounts created:');
    console.log('Admin: tk@admin.com / 01223715643');
    console.log('Student: tk2@admin.com / 01223715643');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
