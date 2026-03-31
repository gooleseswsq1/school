// GET /api/teacher/student-grades?teacherId=xxx
// Trả về điểm từng học sinh theo từng bài kiểm tra (grouped by examKind)
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 });

  try {
    // All exams created by this teacher (any kind)
    const exams = await prisma.exam.findMany({
      where: { creatorId: teacherId, status: { in: ['OPEN', 'CLOSED'] } },
      select: { id: true, title: true, examKind: true },
      orderBy: { createdAt: 'asc' },
    });

    if (exams.length === 0) return NextResponse.json([]);

    const examIds = exams.map(e => e.id);

    // All attempts for these exams
    const attempts = await prisma.studentExamAttempt.findMany({
      where: { examId: { in: examIds }, submittedAt: { not: null } },
      select: {
        examId: true,
        studentId: true,
        score: true,
        maxScore: true,
        student: { select: { id: true, name: true } },
      },
    });

    // Group by studentId
    const studentMap = new Map<string, { studentId: string; studentName: string; scores: { examId: string; title: string; kind: string; score10: number }[] }>();

    for (const attempt of attempts) {
      const exam = exams.find(e => e.id === attempt.examId);
      if (!exam || attempt.score === null || attempt.score === undefined) continue;
      const maxScore = attempt.maxScore || 10;
      const score10 = Math.round((attempt.score / maxScore) * 10 * 100) / 100;

      if (!studentMap.has(attempt.studentId)) {
        studentMap.set(attempt.studentId, {
          studentId: attempt.studentId,
          studentName: attempt.student.name,
          scores: [],
        });
      }
      studentMap.get(attempt.studentId)!.scores.push({
        examId: exam.id,
        title: exam.title,
        kind: exam.examKind || 'PERIOD',
        score10,
      });
    }

    return NextResponse.json([...studentMap.values()]);
  } catch (err) {
    console.error('[GET /api/teacher/student-grades]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
