// app/api/teacher/exams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/teacher/exams?teacherId=xxx&className=xxx
 *
 * Trả về danh sách đề thi của GV kèm thống kê:
 * - submissions: danh sách bài nộp (studentId, score, submittedAt, ...)
 * - classSize: số học sinh trong lớp
 *
 * Dùng cho TestManagementModule thay thế mock data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const className = searchParams.get('className');

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }

  try {
    // Lấy đề thi
    const exams = await prisma.exam.findMany({
      where: {
        creatorId: teacherId,
        ...(className ? { className } : {}),
        status: { not: 'DRAFT' },
      },
      include: {
        items: { select: { id: true, pointsSnapshot: true } },
        attempts: {
          include: {
            student: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Lấy số học sinh theo lớp
    const classNames = [...new Set(exams.map(e => e.className).filter(Boolean))];
    const classCountMap: Record<string, number> = {};
    for (const cn of classNames) {
      if (!cn) continue;
      classCountMap[cn] = await prisma.user.count({
        where: { role: 'STUDENT', className: cn, isActive: true },
      });
    }

    // Map sang ExamStat cho TestManagementModule
    const result = exams.map(exam => {
      const maxScore = exam.items.reduce((sum, item) => sum + item.pointsSnapshot, 0);
      const classSize = classCountMap[exam.className || ''] || 0;

      const submissions = exam.attempts
        .filter(a => a.submittedAt)
        .map(a => ({
          studentId: a.studentId,
          studentName: a.student?.name || `HS_${a.studentId.slice(-4)}`,
          score: a.maxScore && a.maxScore > 0
            ? parseFloat(((a.score || 0) / a.maxScore * 10).toFixed(1))
            : 0,
          rawScore: a.score || 0,
          maxScore: a.maxScore || maxScore,
          submittedAt: a.submittedAt?.toISOString() || '',
          duration: a.timeSpent ? Math.floor(a.timeSpent / 60) : 0,
          isPassed: a.isPassed,
        }));

      return {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        className: exam.className || '',
        totalQ: exam.items.length,
        maxScore,
        duration: exam.duration,
        deadlineAt: exam.closeAt?.toISOString() || '',
        publishedAt: exam.openAt?.toISOString() || exam.createdAt.toISOString(),
        variantCount: exam.variantCount,
        status: exam.status,
        submissions,
        classSize,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/teacher/exams]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}