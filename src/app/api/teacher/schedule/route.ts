import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/teacher/schedule?teacherId=xxx&classId=yyy
 * Trả về danh sách lịch học do giáo viên tạo
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get('teacherId');
  const classId = searchParams.get('classId');

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }

  const where: Record<string, unknown> = { teacherId };
  if (classId) where.classId = classId;

  const schedules = await prisma.schedule.findMany({
    where,
    include: {
      class: { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json(schedules);
}

/**
 * POST /api/teacher/schedule
 * Tạo lịch học mới
 * Body: { teacherId, title, type, subject, date, duration, classId?, description? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teacherId, title, type, subject, date, duration, classId, description, meetingUrl } = body;

    if (!teacherId || !title || !date) {
      return NextResponse.json({ error: 'teacherId, title, date required' }, { status: 400 });
    }

    const schedule = await prisma.schedule.create({
      data: {
        teacherId,
        title,
        type: type || 'lecture',
        subject: subject || null,
        date: new Date(date),
        duration: duration || 45,
        classId: classId || null,
        description: description || null,
        meetingUrl: meetingUrl || null,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/teacher/schedule
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await prisma.schedule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
