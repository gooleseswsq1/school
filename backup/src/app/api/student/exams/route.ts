// app/api/student/exams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/student/exams?studentId=xxx
 *
 * Trả về danh sách đề thi học sinh có thể thấy:
 * - Exam.className === student.className  (cùng lớp)
 * - Exam.status === 'OPEN' | 'CLOSED'
 * - Kèm thông tin bài đã nộp (nếu có)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  try {
    // Lấy thông tin học sinh
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, className: true, schoolId: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Lấy danh sách giáo viên đã linked với học sinh
    const linkedTeachers = await prisma.studentTeacher.findMany({
      where: { studentId, status: 'accepted' },
      select: { teacherId: true },
    });
    const linkedTeacherIds = linkedTeachers.map(lt => lt.teacherId);

    // Tìm đề thi của giáo viên đã linked hoặc đề chung (không có className)
    const exams = await prisma.exam.findMany({
      where: {
        status: { in: ['OPEN', 'CLOSED'] },
        OR: [
          // Đề của giáo viên đã linked
          ...(linkedTeacherIds.length > 0 ? [{ creatorId: { in: linkedTeacherIds } }] : []),
          // Đề chung không giới hạn lớp
          { className: '' },
          { className: null },
          // Đề của lớp học sinh (nếu có)
          ...(student.className ? [{ className: student.className }] : []),
        ],
      },
      include: {
        // Bài nộp của học sinh này
        attempts: {
          where: { studentId },
          select: {
            id: true,
            submittedAt: true,
            score: true,
            maxScore: true,
          },
        },
        creator: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map sang ExamCard cho frontend
    // CLOSED exams chỉ hiển thị nếu học sinh đã nộp bài
    const result = exams
      .filter(exam => {
        if (exam.status === 'OPEN') return true;
        const attempt = exam.attempts[0] || null;
        return !!attempt?.submittedAt;
      })
      .map(exam => {
      const attempt = exam.attempts[0] || null;
      const now = new Date();

      let status: 'open' | 'done' | 'upcoming';
      if (attempt?.submittedAt) {
        status = 'done';
      } else if (exam.status === 'OPEN') {
        status = 'open';
      } else {
        status = 'upcoming';
      }

      // Hiển thị deadline
      let deadline = '';
      if (exam.closeAt) {
        const close = new Date(exam.closeAt);
        const diff = close.getTime() - now.getTime();
        const days = Math.floor(diff / 86_400_000);
        if (days === 0) deadline = `Hôm nay ${close.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        else if (days === 1) deadline = `Ngày mai ${close.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        else if (days > 0) deadline = `Còn ${days} ngày`;
        else deadline = 'Đã hết hạn';
      } else {
        deadline = 'Không giới hạn';
      }

      return {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        teacherId: exam.creatorId,
        duration: exam.duration,
        deadline,
        closeAt: exam.closeAt?.toISOString() ?? null,
        status,
        examKind: exam.examKind,
        reviewUnlocksAt: exam.reviewUnlocksAt?.toISOString() ?? null,
        score: attempt ? (attempt.score ?? undefined) : undefined,
        maxScore: attempt ? (attempt.maxScore ?? undefined) : undefined,
        teacherName: exam.creator?.name || '',
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/student/exams]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}