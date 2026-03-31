// app/api/cron/student-requests-cleanup/route.ts
// Tự động xóa yêu cầu pending quá 1 ngày
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(_req: NextRequest) {
  try {
    const now = new Date();

    // Xóa các yêu cầu pending đã hết hạn
    const result = await prisma.studentTeacher.deleteMany({
      where: {
        status: 'pending',
        requestExpiresAt: { lt: now },
      },
    });

    console.log(`[CRON] Đã xóa ${result.count} yêu cầu hết hạn`);
    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (err: any) {
    console.error('[DELETE /api/cron/student-requests-cleanup]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// GET: Kiểm tra số lượng yêu cầu sắp hết hạn (cho monitoring)
export async function GET(_req: NextRequest) {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const expired = await prisma.studentTeacher.count({
      where: { status: 'pending', requestExpiresAt: { lt: now } },
    });

    const expiringSoon = await prisma.studentTeacher.count({
      where: { status: 'pending', requestExpiresAt: { gte: now, lt: tomorrow } },
    });

    return NextResponse.json({ expired, expiringSoon });
  } catch (err) {
    console.error('[GET /api/cron/student-requests-cleanup]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}