// app/api/exams/[examId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/exams/[examId]?studentId=xxx
 * Trả về đề thi cho học sinh làm bài.
 * KHÔNG trả về answerSnapshot (ẩn đáp án).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const mode = (searchParams.get('mode') || '').toLowerCase();
  const isReviewMode = mode === 'review' || mode === 'practice';

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              select: {
                id: true,
                text: true,
                kind: true,
                difficulty: true,
                points: true,
                chapter: true,
                options: true,
                // KHÔNG include answer ở đây
              },
            },
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Kiểm tra trạng thái
    if (exam.status === 'DRAFT') {
      return NextResponse.json({ error: 'Đề thi chưa được phát hành' }, { status: 403 });
    }

    // Kiểm tra học sinh đã nộp chưa (chế độ thi thật)
    if (studentId && !isReviewMode) {
      const existing = await prisma.studentExamAttempt.findUnique({
        where: { examId_studentId: { examId, studentId } },
      });
      if (existing?.submittedAt) {
        return NextResponse.json({ error: 'Bạn đã nộp bài thi này' }, { status: 409 });
      }
    }

    // Trả về đề thi (ẩn đáp án)
    const safeExam = {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      duration: exam.duration,
      status: exam.status,
      closeAt: exam.closeAt,
      items: exam.items.map(item => {
        // Nếu có question relation → dùng data từ đó
        // Nếu không (upload từ file) → dùng snapshot data
        const hasQuestion = !!item.question;

        // Xác định loại câu hỏi: kindSnapshot → question.kind → suy từ options/text
        const resolveKind = (): string => {
          if ((item as any).kindSnapshot) return (item as any).kindSnapshot;
          if (hasQuestion) return item.question!.kind;
          if (item.textSnapshot?.includes('(TL)')) return 'ESSAY';
          if (item.textSnapshot?.includes('(TF)')) return 'TF';
          try {
            const opts = JSON.parse(item.optionsSnapshot || '[]');
            if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
              if ((opts as any).type === 'TF4') return 'TF4';
              if ((opts as any).type === 'SAQ') return 'SAQ';
              if (Array.isArray((opts as any).subItems) && (opts as any).subItems.length > 0) return 'TF4';
              if (Array.isArray((opts as any).options)) {
                const optionList = (opts as any).options;
                if (optionList.length === 2 && (optionList[0]?.includes('Đúng') || optionList[0]?.includes('Sai'))) return 'TF';
                if (optionList.length > 0) return 'MCQ';
              }
              return 'ESSAY';
            }
            if (!opts.length) return 'ESSAY';
            if (opts.length === 2 && (opts[0]?.includes('Đúng') || opts[0]?.includes('Sai'))) return 'TF';
            return 'MCQ';
          } catch { return item.optionsSnapshot ? 'MCQ' : 'ESSAY'; }
        };

        return {
          id: item.id,
          order: item.order,
          kindSnapshot: (item as any).kindSnapshot || null,
          pointsSnapshot: item.pointsSnapshot,
          textSnapshot: item.textSnapshot,
          optionsSnapshot: item.optionsSnapshot,
          ...(isReviewMode ? { answerSnapshot: item.answerSnapshot } : {}),
          question: hasQuestion
            ? {
                id: item.question!.id,
                text: item.question!.text,
                kind: item.question!.kind,
                points: item.question!.points,
                chapter: item.question!.chapter,
                options: item.question!.options,
              }
            : {
                // Fallback cho exams tạo từ upload file
                id: null,
                text: item.textSnapshot || '',
                kind: resolveKind(),
                points: item.pointsSnapshot || 1,
                chapter: null,
                options: item.optionsSnapshot || '[]',
              },
        };
      }),
    };

    return NextResponse.json(safeExam);
  } catch (error) {
    console.error('[GET /api/exams/[examId]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/exams/[examId]?teacherId=xxx
 * Xóa đề thi (chỉ người tạo đề mới có quyền).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, creatorId: true, title: true },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (exam.creatorId !== teacherId) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa đề thi này' }, { status: 403 });
    }

    await prisma.exam.delete({ where: { id: examId } });

    return NextResponse.json({ ok: true, id: examId, title: exam.title });
  } catch (error) {
    console.error('[DELETE /api/exams/[examId]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}