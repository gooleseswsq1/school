import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/student/schedule?studentId=xxx
 *
 * Trả về lịch học hợp nhất:
 * 1. Schedule entries do giáo viên liên kết tạo (cho lớp / chung)
 * 2. Exam deadlines (openAt → closeAt) từ giáo viên liên kết
 * Sắp xếp theo ngày tăng dần.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 });
  }

  // 1. Tìm giáo viên liên kết (accepted)
  const links = await prisma.studentTeacher.findMany({
    where: { studentId, status: 'accepted' },
    select: { teacherId: true, classId: true, teacher: { select: { name: true } } },
  });

  if (links.length === 0) {
    return NextResponse.json([]);
  }

  const teacherIds = links.map(l => l.teacherId);
  const classIds = links.map(l => l.classId).filter(Boolean) as string[];
  const teacherMap = Object.fromEntries(links.map(l => [l.teacherId, l.teacher.name]));

  // 2. Fetch Schedule entries từ giáo viên
  const schedules = await prisma.schedule.findMany({
    where: {
      teacherId: { in: teacherIds },
      OR: [
        { classId: { in: classIds.length > 0 ? classIds : ['__none__'] } },
        { classId: null },
      ],
    },
    orderBy: { date: 'asc' },
  });

  // 3. Fetch upcoming Exams (OPEN hoặc có deadline trong tương lai gần)
  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 86_400_000);

  const exams = await prisma.exam.findMany({
    where: {
      creatorId: { in: teacherIds },
      status: { in: ['OPEN', 'CLOSED'] },
      OR: [
        { closeAt: { gte: now, lte: twoWeeksLater } },
        { openAt: { gte: now, lte: twoWeeksLater } },
        { closeAt: { gte: now } },
      ],
    },
    select: {
      id: true,
      title: true,
      subject: true,
      duration: true,
      openAt: true,
      closeAt: true,
      creatorId: true,
      status: true,
    },
  });

  // 4. Merge thành ScheduleItem[]
  type ScheduleItem = {
    id: string;
    title: string;
    subject: string;
    type: 'lecture' | 'exam' | 'assignment';
    date: string;
    time: string;
    duration: number;
    teacher: string;
  };

  const items: ScheduleItem[] = [];

  // Schedule entries
  for (const s of schedules) {
    const d = new Date(s.date);
    items.push({
      id: s.id,
      title: s.title,
      subject: s.subject || '',
      type: s.type as 'lecture' | 'exam' | 'assignment',
      date: d.toISOString().split('T')[0],
      time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      duration: s.duration,
      teacher: teacherMap[s.teacherId] || '',
    });
  }

  // Exam deadlines
  for (const e of exams) {
    const d = new Date(e.closeAt || e.openAt || now);
    items.push({
      id: `exam-${e.id}`,
      title: e.title,
      subject: e.subject || '',
      type: 'exam',
      date: d.toISOString().split('T')[0],
      time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      duration: e.duration,
      teacher: teacherMap[e.creatorId] || '',
    });
  }

  // Sort by date
  items.sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());

  return NextResponse.json(items);
}
