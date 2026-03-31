// app/api/auth/check-teacher-code/route.ts
// Kiểm tra mã giáo viên có hợp lệ không (cho đăng ký & +Key)
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code) return NextResponse.json({ valid: false, error: 'Thiếu mã' });

  try {
    const teacher = await prisma.user.findFirst({
      where: { teacherCode: code, role: 'TEACHER', isActive: true },
      select: { id: true, name: true, subjects: true, schoolId: true },
    });

    if (!teacher) {
      return NextResponse.json({ valid: false, error: 'Mã không tồn tại' });
    }

    // Parse subjects
    let subject = '';
    try {
      const arr = JSON.parse(teacher.subjects || '[]');
      subject = Array.isArray(arr) ? arr.join(', ') : '';
    } catch { /* ignore */ }

    // Lấy tên trường
    let schoolName = '';
    if (teacher.schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: teacher.schoolId },
        select: { name: true },
      });
      schoolName = school?.name || '';
    }

    return NextResponse.json({
      valid: true,
      teacherId: teacher.id,
      teacherName: teacher.name,
      subject,
      schoolName,
    });
  } catch (err) {
    console.error('[GET /api/auth/check-teacher-code]', err);
    return NextResponse.json({ valid: false, error: 'Lỗi server' });
  } finally {
    await prisma.$disconnect();
  }
}