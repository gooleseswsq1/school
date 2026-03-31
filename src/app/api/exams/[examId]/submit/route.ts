// app/api/exams/[examId]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeBoolLike(v: string): string {
  const value = v.trim().toLowerCase();
  if (['đ', 'đúng', 'true', '1'].includes(value)) return 'ĐÚNG';
  if (['s', 'sai', 'false', '0'].includes(value)) return 'SAI';
  return v.trim().toUpperCase();
}

function parseTF4Map(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).reduce<Record<string, string>>((acc, [k, v]) => {
        acc[k.toLowerCase()] = normalizeBoolLike(String(v || ''));
        return acc;
      }, {});
    }
  } catch {
    // ignore and fallback regex parser below
  }

  const out: Record<string, string> = {};
  const parts = trimmed.match(/([a-d])\s*[\-\)]\s*(Đ|S|Đúng|Sai|True|False|1|0)/gi) || [];
  parts.forEach((part) => {
    const m = part.match(/([a-d])\s*[\-\)]\s*(Đ|S|Đúng|Sai|True|False|1|0)/i);
    if (m) out[m[1].toLowerCase()] = normalizeBoolLike(m[2]);
  });
  return out;
}

/**
 * POST /api/exams/[examId]/submit
 * Body: {
 *   studentId: string,
 *   answers: Record<itemId, string>   // { "itemId123": "A", "itemId456": "Đúng", ... }
 *   timeSpent?: number  // giây
 * }
 *
 * Logic chấm điểm:
 * - MCQ/TF: so sánh answers[itemId] với answerSnapshot → tự động
 * - ESSAY: đánh dấu isPassed = null, chờ GV chấm
 *
 * Returns: { score, maxScore, isPassed, attemptId }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;

  try {
    const body = await request.json();
    const { studentId, answers = {}, timeSpent } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    // Kiểm tra đã nộp chưa
    const existing = await prisma.studentExamAttempt.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });
    if (existing?.submittedAt) {
      return NextResponse.json({ error: 'Bạn đã nộp bài thi này rồi' }, { status: 409 });
    }

    // Lấy exam + items + answerSnapshot
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        items: {
          include: {
            question: { select: { kind: true } },
          },
        },
      },
    });

    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

    // ── Chấm điểm tự động ────────────────────────────────
    let score = 0;
    let maxScore = 0;
    let hasEssay = false;

    for (const item of exam.items) {
      const points = item.pointsSnapshot;
      maxScore += points;

      const kind = String(item.question?.kind || (item as any).kindSnapshot || 'MCQ').toUpperCase();

      // ESSAY → GV chấm sau (chỉ ESSAY, không SAQ)
      if (kind === 'ESSAY') {
        hasEssay = true;
        continue;
      }

      // SAQ → chấm tự động bằng so sánh số (hỗ trợ dấu phẩy thập phân VN)
      if (kind === 'SAQ') {
        const studentRaw = (answers[item.id] || '').trim().replace(',', '.');
        const correctRaw = (item.answerSnapshot || '').trim().replace(',', '.');
        const studentNum = parseFloat(studentRaw);
        const correctNum = parseFloat(correctRaw);
        const tolerance = (item as any).toleranceSnapshot ?? 0;

        if (!isNaN(studentNum) && !isNaN(correctNum) && Math.abs(studentNum - correctNum) <= tolerance) {
          score += points;
        } else if (isNaN(correctNum)) {
          // Đáp án không phải số → so sánh text (fallback)
          if (studentRaw.toLowerCase() === correctRaw.toLowerCase()) {
            score += points;
          }
        }
        continue;
      }

      // TF4 → chấm từng phần theo chuẩn K12 2025
      if (kind === 'TF4') {
        const correctMap = parseTF4Map(item.answerSnapshot);
        const studentMap = parseTF4Map(answers[item.id]);
        const keys = Object.keys(correctMap);
        if (keys.length > 0) {
          const correctCount = keys.filter((k) => studentMap[k] && studentMap[k] === correctMap[k]).length;
          const total = keys.length; // thường = 4
          // Thang điểm K12 2025: 4/4=100%, 3/4=50%, 2/4=25%, 1/4=10%, 0/4=0%
          let ratio = 0;
          if (correctCount === total) ratio = 1;
          else if (correctCount === total - 1) ratio = 0.5;
          else if (correctCount === total - 2) ratio = 0.25;
          else if (correctCount >= 1) ratio = 0.1;
          score += points * ratio;
        }
        continue;
      }

      // MCQ / TF → so sánh trực tiếp
      const correctAnswer = normalizeBoolLike(item.answerSnapshot || '');
      const studentAnswer = normalizeBoolLike(answers[item.id] || '');

      if (studentAnswer && studentAnswer === correctAnswer) {
        score += points;
      }
    }

    // isPassed: null nếu còn tự luận, true/false nếu toàn trắc nghiệm
    const isPassed = hasEssay ? null : score >= maxScore * 0.5;

    // ── Lưu vào DB ────────────────────────────────────────
    const attempt = await prisma.studentExamAttempt.upsert({
      where: { examId_studentId: { examId, studentId } },
      update: {
        answers: JSON.stringify(answers),
        score,
        maxScore,
        isPassed,
        submittedAt: new Date(),
        timeSpent: timeSpent || null,
      },
      create: {
        examId,
        studentId,
        answers: JSON.stringify(answers),
        score,
        maxScore,
        isPassed,
        submittedAt: new Date(),
        timeSpent: timeSpent || null,
      },
    });

    return NextResponse.json({
      ok: true,
      attemptId: attempt.id,
      score,
      maxScore,
      isPassed,
      hasEssay,
      message: hasEssay
        ? 'Đã nộp bài. Phần tự luận đang chờ giáo viên chấm.'
        : `Điểm của bạn: ${score.toFixed(1)} / ${maxScore}`,
    });

  } catch (error: any) {
    console.error('[POST /api/exams/[examId]/submit]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}