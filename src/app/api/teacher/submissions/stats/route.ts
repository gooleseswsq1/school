// app/api/teacher/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/teacher/stats?teacherId=xxx&className=xxx
 * Trả về: { lectureCount, openExamCount, studentCount }
 * Dùng cho TeacherMainDashboard stats row.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const className = searchParams.get('className') || '';
  const classId   = searchParams.get('classId')   || '';

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }

  try {
    const [lectureCount, openExamCount, studentCount] = await Promise.all([
      // Số bài giảng (Page) đã publish của GV này — lọc theo lớp nếu có
      prisma.page.count({
        where: {
          authorId: teacherId,
          isPublished: true,
          parentId: null,
          ...(classId ? { classId } : {}),
        },
      }),

      // Số đề thi đang OPEN do GV tạo, lọc theo className
      prisma.exam.count({
        where: {
          creatorId: teacherId,
          status: 'OPEN',
          ...(className ? {
            OR: [
              { className },
              { className: '' },
            ],
          } : {}),
        },
      }),

      // Số học sinh đã liên kết và được chấp nhận — lọc theo lớp nếu có
      prisma.studentTeacher.count({
        where: {
          teacherId,
          status: 'accepted',
          ...(classId ? { classId } : {}),
        },
      }),
    ]);

    return NextResponse.json({ lectureCount, openExamCount, studentCount });
  } catch (error) {
    console.error('[GET /api/teacher/stats]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}