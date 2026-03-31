// Script tạo tài khoản Admin
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@gmail.com';
  const password = '01223715643';
  const name = 'Admin';

  try {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  Email đã tồn tại trong hệ thống!');
      console.log('Email:', existingUser.email);
      console.log('Role:', existingUser.role);
      console.log('Name:', existingUser.name);
      
      // Hỏi có muốn cập nhật không
      const hashed = await bcrypt.hash(password, 10);
      const updated = await prisma.user.update({
        where: { email },
        data: {
          password: hashed,
          role: 'ADMIN',
          isActive: true,
          name: name,
        },
      });
      console.log('✅ Đã cập nhật tài khoản admin thành công!');
      console.log('ID:', updated.id);
      console.log('Email:', updated.email);
      console.log('Role:', updated.role);
      return;
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Tạo admin user
    const admin = await prisma.user.create({
      data: {
        name: name,
        email: email.toLowerCase().trim(),
        password: hashed,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ Tạo tài khoản admin thành công!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ID:', admin.id);
    console.log('Email:', admin.email);
    console.log('Password:', password);
    console.log('Role:', admin.role);
    console.log('Name:', admin.name);
    console.log('isActive:', admin.isActive);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Lỗi khi tạo admin:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();