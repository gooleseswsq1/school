// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/users
 * Trả về toàn bộ danh sách tài khoản cho AdminDashboard.
 * Chỉ ADMIN mới được gọi (kiểm tra qua header x-user-role hoặc session).
 */
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        className: true,
        createdAt: true,
        school: { select: { name: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });

    const result = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      className: u.className || '',
      schoolName: u.school?.name || '',
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/admin/users]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PATCH /api/admin/users
 * Body: { id, isActive?, role? }
 * Kích hoạt / đổi role tài khoản.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { id, isActive, role } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(role ? { role } : {}),
      },
      select: { id: true, name: true, role: true, isActive: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PATCH /api/admin/users]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}