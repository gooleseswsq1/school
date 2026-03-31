// app/api/teacher/student-requests/route.ts
// Giáo viên xem & xử lý yêu cầu từ học sinh
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Lấy danh sách yêu cầu pending + học sinh đã chấp nhận
export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  const classId = req.nextUrl.searchParams.get('classId');
  if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 });

  const classFilter = classId ? { classId } : {};

  try {
    // Yêu cầu pending
    const pending = await prisma.studentTeacher.findMany({
      where: { teacherId, status: 'pending', ...classFilter },
      include: {
        student: { select: { id: true, name: true, email: true, className: true, schoolId: true } },
        class: { select: { id: true, name: true, grade: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });

    // Học sinh đã chấp nhận
    const accepted = await prisma.studentTeacher.findMany({
      where: { teacherId, status: 'accepted', ...classFilter },
      include: {
        student: { select: { id: true, name: true, email: true, className: true, schoolId: true, lastLoginAt: true } },
        class: { select: { id: true, name: true, grade: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const mapStudent = async (link: any & { student: { lastLoginAt?: Date | null } }) => {
      let schoolName = '';
      if (link.student.schoolId) {
        const school = await prisma.school.findUnique({ where: { id: link.student.schoolId }, select: { name: true } });
        schoolName = school?.name || '';
      }
      const attempts = await prisma.studentExamAttempt.findMany({
        where: { studentId: link.student.id, submittedAt: { not: null } },
        select: { submittedAt: true },
        orderBy: { submittedAt: 'desc' },
      });
      const dayKeys = Array.from(new Set(
        attempts
          .map(a => a.submittedAt)
          .filter((d): d is Date => !!d)
          .map(d => d.toISOString().slice(0, 10))
      ));
      const activeDays = dayKeys.length;
      let streak = 0;
      if (dayKeys.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daySet = new Set(dayKeys);
        let cursor = new Date(today);
        while (daySet.has(cursor.toISOString().slice(0, 10))) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
      }
      const lastSeenDaysAgo = link.student.lastLoginAt
        ? Math.floor((Date.now() - new Date(link.student.lastLoginAt).getTime()) / 86_400_000)
        : undefined;
      return {
        linkId: link.id,
        studentId: link.student.id,
        studentName: link.student.name,
        studentEmail: link.student.email,
        className: link.class?.name || link.student.className || '',
        schoolName,
        status: link.status,
        requestedAt: link.joinedAt,
        expiresAt: link.requestExpiresAt,
        activeDays,
        streak,
        lastSeenDaysAgo,
      };
    };

    const pendingList = await Promise.all(pending.map(mapStudent));
    const acceptedList = await Promise.all(accepted.map(mapStudent));

    return NextResponse.json({ pending: pendingList, accepted: acceptedList });
  } catch (err) {
    console.error('[GET /api/teacher/student-requests]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST: Chấp nhận / Từ chối yêu cầu
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { linkId, action } = body; // action: "accept" | "reject"

    if (!linkId || !action) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin' }, { status: 400 });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    const updated = await prisma.studentTeacher.update({
      where: { id: linkId },
      data: { status: newStatus, requestExpiresAt: null },
    });

    return NextResponse.json({
      success: true,
      message: action === 'accept' ? 'Đã chấp nhận học sinh' : 'Đã từ chối yêu cầu',
      linkId: updated.id,
      status: updated.status,
    });
  } catch (err: any) {
    console.error('[POST /api/teacher/student-requests]', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}