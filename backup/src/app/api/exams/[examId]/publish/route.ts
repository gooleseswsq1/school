// app/api/exams/[examId]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/exams/[examId]/publish
 * Body: { closeAt?: string }
 * Chuyển trạng thái DRAFT → OPEN.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const closeAt = body.closeAt ? new Date(body.closeAt) : null;

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    if (exam.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Chỉ có thể phát hành đề ở trạng thái DRAFT' }, { status: 400 });
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        status: 'OPEN',
        openAt: new Date(),
        ...(closeAt ? { closeAt } : {}),
      },
    });

    return NextResponse.json({ ok: true, exam: { id: updated.id, status: updated.status, openAt: updated.openAt } });
  } catch (error: any) {
    console.error('[POST /api/exams/[examId]/publish]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}