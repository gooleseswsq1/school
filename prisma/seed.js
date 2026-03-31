/**
 * Database Seed Script
 * Creates initial admin account
 * 
 * Run with: node prisma/seed.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@school.com' },
    });

    if (existingAdmin) {
      console.log('✓ Admin account already exists');
      return;
    }

    // Create admin account
    const hashedPassword = await bcrypt.hash('01223715643', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@school.com',
        name: 'Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✓ Admin account created successfully');
    console.log(`  Email: ${admin.email}`);
    console.log(`  Password: 01223715643`);
    console.log(`  Role: ${admin.role}`);
  } catch (error) {
    console.error('✗ Error seeding database:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
