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

/**
 * GET /api/student/goals?studentId=xxx
 * Trả về danh sách mục tiêu của học sinh
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 });
  }

  try {
    const goals = await prisma.studentGoal.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(goals);
  } catch (err: unknown) {
    if (isDbConnectionError(err)) {
      return NextResponse.json(
        { error: 'Database unavailable, vui long thu lai sau it phut' },
        { status: 503 }
      );
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/student/goals
 * Tạo mục tiêu mới
 * Body: { studentId, title, target, unit?, deadline?, color? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, title, target, unit, deadline, color } = body;

    if (!studentId || !title || target == null) {
      return NextResponse.json({ error: 'studentId, title, target required' }, { status: 400 });
    }

    const goal = await prisma.studentGoal.create({
      data: {
        studentId,
        title,
        target: parseFloat(target),
        unit: unit || 'bài',
        deadline: deadline ? new Date(deadline) : null,
        color: color || '#3B82F6',
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (err: unknown) {
    if (isDbConnectionError(err)) {
      return NextResponse.json(
        { error: 'Database unavailable, vui long thu lai sau it phut' },
        { status: 503 }
      );
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/student/goals
 * Cập nhật mục tiêu (tiến độ, tiêu đề, v.v.)
 * Body: { id, current?, title?, target?, unit?, deadline?, color? }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.current != null) updateData.current = parseFloat(data.current);
    if (data.title) updateData.title = data.title;
    if (data.target != null) updateData.target = parseFloat(data.target);
    if (data.unit) updateData.unit = data.unit;
    if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.color) updateData.color = data.color;

    const goal = await prisma.studentGoal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(goal);
  } catch (err: unknown) {
    if (isDbConnectionError(err)) {
      return NextResponse.json(
        { error: 'Database unavailable, vui long thu lai sau it phut' },
        { status: 503 }
      );
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/student/goals
 * Xóa mục tiêu
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await prisma.studentGoal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (isDbConnectionError(err)) {
      return NextResponse.json(
        { error: 'Database unavailable, vui long thu lai sau it phut' },
        { status: 503 }
      );
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
