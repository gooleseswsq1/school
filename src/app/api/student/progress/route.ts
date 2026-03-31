import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUBJECT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
];

/**
 * GET /api/student/progress?studentId=xxx
 *
 * Tính tiến độ học tập theo môn:
 * - Nhóm exams theo subject từ giáo viên liên kết
 * - Đếm exam đã nộp (có attempt) vs tổng
 * - Trả về: [{ subject, completed, total, percentage, color }]
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 });
  }

  // 1. Tìm giáo viên liên kết
  const links = await prisma.studentTeacher.findMany({
    where: { studentId, status: 'accepted' },
    select: { teacherId: true },
  });

  if (links.length === 0) {
    return NextResponse.json([]);
  }

  const teacherIds = links.map(l => l.teacherId);

  // 2. Lấy tất cả exams (không phải DRAFT) từ giáo viên
  const exams = await prisma.exam.findMany({
    where: {
      creatorId: { in: teacherIds },
      status: { not: 'DRAFT' },
    },
    select: {
      id: true,
      subject: true,
    },
  });

  if (exams.length === 0) {
    return NextResponse.json([]);
  }

  // 3. Lấy attempts đã submit của student
  const examIds = exams.map(e => e.id);
  const attempts = await prisma.studentExamAttempt.findMany({
    where: {
      studentId,
      examId: { in: examIds },
      submittedAt: { not: null },
    },
    select: { examId: true },
  });

  const submittedExamIds = new Set(attempts.map(a => a.examId));

  // 4. Nhóm theo subject
  const subjectMap = new Map<string, { total: number; completed: number }>();

  for (const exam of exams) {
    const sub = exam.subject || 'Khác';
    const existing = subjectMap.get(sub) || { total: 0, completed: 0 };
    existing.total++;
    if (submittedExamIds.has(exam.id)) existing.completed++;
    subjectMap.set(sub, existing);
  }

  // 5. Chuyển thành mảng kết quả
  const result = Array.from(subjectMap.entries()).map(([subject, data], index) => ({
    subject,
    completed: data.completed,
    total: data.total,
    percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
  }));

  // Sắp xếp theo tên môn
  result.sort((a, b) => a.subject.localeCompare(b.subject, 'vi'));

  return NextResponse.json(result);
}
