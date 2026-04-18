// app/api/teacher/student-requests/route.ts
// Giáo viên xem & xử lý yêu cầu từ học sinh
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function isDbConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1017'].includes(error.code);
  }
  return false;
}

// GET: Lấy danh sách yêu cầu pending + học sinh đã chấp nhận
export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  const classId = req.nextUrl.searchParams.get('classId');
  if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 });

  const classFilter = classId
    ? {
        OR: [
          { classId },
          { classId: null },
        ],
      }
    : {};

  try {
    const [pending, accepted] = await Promise.all([
      prisma.studentTeacher.findMany({
        where: { teacherId, status: 'pending', ...classFilter },
        include: {
          student: { select: { id: true, name: true, email: true, className: true, schoolId: true, lastLoginAt: true } },
          class: { select: { id: true, name: true, grade: true } },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.studentTeacher.findMany({
        where: { teacherId, status: 'accepted', ...classFilter },
        include: {
          student: { select: { id: true, name: true, email: true, className: true, schoolId: true, lastLoginAt: true } },
          class: { select: { id: true, name: true, grade: true } },
        },
        orderBy: { joinedAt: 'desc' },
      }),
    ]);

    const allLinks = [...pending, ...accepted];
    const schoolIds = Array.from(
      new Set(
        allLinks
          .map((link) => link.student.schoolId)
          .filter((schoolId): schoolId is string => Boolean(schoolId))
      )
    );
    const studentIds = Array.from(new Set(allLinks.map((link) => link.student.id)));

    const [schools, attempts] = await Promise.all([
      schoolIds.length
        ? prisma.school.findMany({ where: { id: { in: schoolIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      studentIds.length
        ? prisma.studentExamAttempt.findMany({
            where: { studentId: { in: studentIds }, submittedAt: { not: null } },
            select: { studentId: true, submittedAt: true },
            orderBy: { submittedAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const schoolNameById = new Map(schools.map((school) => [school.id, school.name]));
    const attemptDaysByStudent = new Map<string, Set<string>>();

    for (const attempt of attempts) {
      if (!attempt.submittedAt) {
        continue;
      }
      const day = attempt.submittedAt.toISOString().slice(0, 10);
      const days = attemptDaysByStudent.get(attempt.studentId) || new Set<string>();
      days.add(day);
      attemptDaysByStudent.set(attempt.studentId, days);
    }

    const mapStudent = (link: (typeof allLinks)[number]) => {
      const daySet = attemptDaysByStudent.get(link.student.id) || new Set<string>();
      const dayKeys = Array.from(daySet);
      const activeDays = dayKeys.length;

      let streak = 0;
      if (activeDays > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cursor = new Date(today);
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
        schoolName: link.student.schoolId ? schoolNameById.get(link.student.schoolId) || '' : '',
        status: link.status,
        requestedAt: link.joinedAt,
        expiresAt: link.requestExpiresAt,
        activeDays,
        streak,
        lastSeenDaysAgo,
      };
    };

    const pendingList = pending.map(mapStudent);
    const acceptedList = accepted.map(mapStudent);

    return NextResponse.json({ pending: pendingList, accepted: acceptedList });
  } catch (err) {
    console.error('[GET /api/teacher/student-requests]', err);
    if (isDbConnectionError(err)) {
      return NextResponse.json({ error: 'Database unavailable, vui long thu lai sau it phut' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
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
    if (isDbConnectionError(err)) {
      return NextResponse.json({ success: false, error: 'Database unavailable, vui long thu lai sau it phut' }, { status: 503 });
    }
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  }
}