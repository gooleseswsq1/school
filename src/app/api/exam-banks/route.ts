// app/api/exam-banks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/exam-banks?authorId=xxx
 * Trả về danh sách ngân hàng đề của giáo viên, kèm câu hỏi.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authorId = searchParams.get('authorId');

  if (!authorId) {
    return NextResponse.json({ error: 'authorId is required' }, { status: 400 });
  }

  try {
    const banks = await prisma.examBank.findMany({
      where: { authorId, isActive: true },
      include: {
        questions: {
          orderBy: { num: 'asc' },
          select: {
            id: true,
            num: true,
            text: true,
            kind: true,
            difficulty: true,
            difficultyNum: true,
            chapter: true,
            points: true,
            options: true,
            answer: true,
          },
        },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(banks);
  } catch (error) {
    console.error('[GET /api/exam-banks]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/exam-banks?id=xxx
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    await prisma.examBank.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } finally {
    await prisma.$disconnect();
  }
}